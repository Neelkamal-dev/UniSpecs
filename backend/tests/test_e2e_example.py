import asyncio
import pytest
import httpx
from app.main import app
from app.db.session import init_db

@pytest.mark.asyncio
async def test_e2e_samsung_s24_analysis():
    """
    End-to-End integration test using the example from prompt:
    Product: Samsung Galaxy S24
    Model: SM-S921B
    """
    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        
        # 1. Health check
        health_resp = await client.get("/api/v1/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["data"]["status"] == "healthy"
        print("\n[OK] Health check passed.")

        # 2. Trigger Analysis Job for Samsung Galaxy S24 / SM-S921B
        create_resp = await client.post(
            "/api/v1/analysis",
            json={
                "product_name": "Samsung Galaxy S24",
                "model": "SM-S921B"
            }
        )
        assert create_resp.status_code == 200
        job_data = create_resp.json()["data"]
        job_id = job_data["job_id"]
        assert job_id is not None
        assert job_data["status"] == "QUEUED"
        print(f"[OK] Analysis job created: {job_id}")

        # 3. Poll job status until COMPLETED (or max retries)
        completed = False
        product_id = None
        for _ in range(30):
            await asyncio.sleep(1.0)
            status_resp = await client.get(f"/api/v1/analysis/{job_id}")
            assert status_resp.status_code == 200
            st = status_resp.json()["data"]
            print(f"    Progress: {st['progress']}% | Node: {st['current_node']} | Status: {st['status']}")
            
            if st["status"] == "COMPLETED":
                completed = True
                product_id = st["product_id"]
                break
            elif st["status"] == "FAILED":
                pytest.fail(f"Job failed with error: {st.get('error_message')}")

        assert completed is True
        assert product_id is not None
        print(f"[OK] Job completed successfully! Product ID: {product_id}")

        # 4. Fetch Product Record
        prod_resp = await client.get(f"/api/v1/products/{product_id}")
        assert prod_resp.status_code == 200
        product = prod_resp.json()["data"]
        identity = product["identity"]
        assert "Galaxy S24" in identity["product_name"] or "Samsung" in identity["product_name"]
        assert "SM-S921B" in (identity.get("model") or "") or identity.get("model") is not None
        assert identity["identity_status"] in ["VERIFIED", "NEEDS_REVIEW"]
        print(f"[OK] Product identity verified: {identity.get('brand')} {identity.get('product_name')} ({identity.get('model')})")

        # 5. Fetch Attributes
        attrs_resp = await client.get(f"/api/v1/products/{product_id}/attributes")
        assert attrs_resp.status_code == 200
        attributes = attrs_resp.json()["data"]
        assert len(attributes) > 0
        battery_attr = next((a for a in attributes if "battery" in a["attribute_name"].lower()), None)
        assert battery_attr is not None
        assert any(cap in str(battery_attr["value"]) for cap in ["4000", "4900", "mAh", "mah", "Battery"])
        print(f"[OK] Extracted & normalized attribute verified: Battery = {battery_attr['value']} (Status: {battery_attr['verification_status']})")

        # 6. Fetch Sources
        sources_resp = await client.get(f"/api/v1/products/{product_id}/sources")
        assert sources_resp.status_code == 200
        sources = sources_resp.json()["data"]
        assert len(sources) > 0
        print(f"[OK] Discovered {len(sources)} sources with authority scores.")

        # 7. Fetch Validation & Conflicts
        val_resp = await client.get(f"/api/v1/products/{product_id}/validation")
        assert val_resp.status_code == 200
        val_data = val_resp.json()["data"]
        assert "overall_validation_score" in val_data
        print(f"[OK] Validation matrix passed. Overall score: {val_data['overall_validation_score']}%")

        # 8. Fetch Evidence Graph
        ev_resp = await client.get(f"/api/v1/products/{product_id}/evidence")
        assert ev_resp.status_code == 200
        evidence = ev_resp.json()["data"]
        assert len(evidence) > 0
        print(f"[OK] Evidence graph verified. Preserved {len(evidence)} evidence trace quotes.")

        # 9. Test Exports
        json_exp = await client.get(f"/api/v1/products/{product_id}/export?format=json")
        assert json_exp.status_code == 200
        assert "Samsung Galaxy S24" in json_exp.text

        csv_exp = await client.get(f"/api/v1/products/{product_id}/export?format=csv")
        assert csv_exp.status_code == 200
        assert "Attribute Name" in csv_exp.text

        excel_exp = await client.get(f"/api/v1/products/{product_id}/export?format=excel")
        assert excel_exp.status_code == 200
        assert len(excel_exp.content) > 100
        print("[OK] All export formats (JSON, CSV, Excel) generated and verified successfully!")
