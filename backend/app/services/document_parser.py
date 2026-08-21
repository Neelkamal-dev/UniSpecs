import os
import socket
import urllib.parse
import ipaddress
import httpx
try:
    import pymupdf as fitz
except ImportError:
    import fitz  # PyMuPDF fallback
from bs4 import BeautifulSoup
from typing import Dict, Any, List

class DocumentParser:
    """
    Unified Document Processing Service.
    Converts PDFs, HTML, or raw text into a standard internal document representation:
    {
      "source_id": "...",
      "title": "...",
      "text": "...",
      "pages": [{"page_number": 1, "text": "..."}],
      "metadata": {}
    }
    """

    @staticmethod
    def is_safe_url(url: str) -> bool:
        """
        SSRF Protection: Resolves the domain and checks if the target IP is private,
        loopback, or link-local.
        """
        try:
            parsed = urllib.parse.urlparse(url)
            if parsed.scheme not in ["http", "https"]:
                return False
            host = parsed.hostname
            if not host:
                return False
            ip = socket.gethostbyname(host)
            ip_obj = ipaddress.ip_address(ip)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
                return False
            return True
        except Exception:
            return False

    @staticmethod
    async def fetch_url_content(url: str) -> str:
        """
        Fetches the web page content from a safe URL.
        """
        if not DocumentParser.is_safe_url(url):
            raise ValueError(f"SSRF Protection: URL resolves to a private or unsafe IP address: {url}")
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.text

    @staticmethod
    def parse_pdf(file_path: str, source_id: str = "") -> Dict[str, Any]:
        """
        Parses PDF file using PyMuPDF (fitz) and extracts structured page-by-page text.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        doc = fitz.open(file_path)
        title = doc.metadata.get("title") or os.path.basename(file_path)
        
        pages_data: List[Dict[str, Any]] = []
        full_text_chunks: List[str] = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text") or ""
            pages_data.append({
                "page_number": page_num + 1,
                "text": text.strip()
            })
            if text.strip():
                full_text_chunks.append(f"--- PAGE {page_num + 1} ---\n{text.strip()}")

        doc.close()

        return {
            "source_id": source_id,
            "title": title,
            "text": "\n\n".join(full_text_chunks),
            "pages": pages_data,
            "metadata": {
                "format": "PDF",
                "page_count": len(pages_data),
                "file_name": os.path.basename(file_path)
            }
        }

    @staticmethod
    def parse_html(html_content: str, url: str = "", source_id: str = "") -> Dict[str, Any]:
        """
        Parses web page HTML using BeautifulSoup to extract clean text.
        """
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Remove script and style elements
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()

        title = soup.title.string if soup.title else url
        clean_text = soup.get_text(separator="\n")
        
        # Collapse multiple newlines
        lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
        compact_text = "\n".join(lines)

        return {
            "source_id": source_id,
            "title": str(title).strip() if title else "Web Document",
            "text": compact_text,
            "pages": [{"page_number": 1, "text": compact_text}],
            "metadata": {
                "format": "HTML",
                "url": url,
                "page_count": 1
            }
        }
