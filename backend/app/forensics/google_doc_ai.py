import os
from google.cloud import documentai
from google.api_core.client_options import ClientOptions
from app.core.config import settings

def process_document(file_path: str, mime_type: str = "application/pdf") -> dict:
    """
    Processes a document using Google Cloud Document AI.
    """
    project_id = settings.GOOGLE_CLOUD_PROJECT
    location = settings.GOOGLE_CLOUD_LOCATION
    processor_id = settings.GOOGLE_DOCUMENT_AI_PROCESSOR_ID

    # You must set GOOGLE_APPLICATION_CREDENTIALS environment variable
    # to point to your service account JSON file.
    
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    name = client.processor_path(project_id, location, processor_id)

    with open(file_path, "rb") as image:
        image_content = image.read()

    raw_document = documentai.RawDocument(content=image_content, mime_type=mime_type)
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)

    try:
        result = client.process_document(request=request)
        document = result.document

        # Map to our common format
        results = {
            "text": document.text,
            "raw_data": [],
            "engine": "Google Cloud Document AI",
            "confidence": 0.99, # Document AI usually provides entity-level confidence
        }

        # Extract blocks/paragraphs for bounding box support
        # This is a simplified mapping; a full implementation would map blocks/paragraphs
        # to the frontend's expected bbox format.
        for page in document.pages:
            for paragraph in page.paragraphs:
                # Layout-aware extraction
                text = _get_text(paragraph.layout.text_anchor, document.text)
                vertices = paragraph.layout.bounding_poly.normalized_vertices
                # Frontend expects [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
                bbox = [[v.x, v.y] for v in vertices]
                
                results["raw_data"].append({
                    "text": text,
                    "bbox": bbox,
                    "conf": 0.99, # Placeholder
                    "page": page.page_number - 1
                })

        return results
    except Exception as e:
        print(f"Document AI Error: {e}")
        return None

def _get_text(text_anchor, full_text):
    """
    Extracts text from a text anchor.
    """
    response = ""
    for segment in text_anchor.text_segments:
        start_index = int(segment.start_index)
        end_index = int(segment.end_index)
        response += full_text[start_index:end_index]
    return response.strip()
