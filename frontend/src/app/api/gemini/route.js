import { NextResponse } from 'next/server';

const MODELS_TO_TRY = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-pro',
    'gemini-1.0-pro-vision-latest'
];

const PROMPT = `You are an expert Indian vehicle document forensic analyst.

Analyze this document. It can be ANY type of Indian vehicle document:
RC Book, RTO e-Fee Receipt, Vehicle Sale Invoice, Insurance Certificate,
Hypothecation Letter, Challan, Form 20, Form 21, Loan Document,
Dealer Invoice, Scanned copy, Photo, or any other vehicle document.
Works on any language (English, Hindi, mixed) and any quality.

EXTRACT EXACTLY TWO FIELDS:

1. VEHICLE REGISTRATION NUMBER
   Strict Indian format:
   - 2 state letters: AP AR AS BR CG CH DD DL DN GA GJ HR HP JH JK KA 
     KL LA LD MH ML MN MP MZ NL OD PB PY RJ SK TN TR TS UK UP WB AN OR
   - 2 district digits (00-99)
   - 1 to 3 series letters (NOT month names)
   - 3 to 4 vehicle digits at end
   - Total 8 to 10 characters without spaces
   - Examples: WB20BD6081, TN09AB1234, MH12EF9876
   - REJECT: values over 10 chars, dates, application numbers,
     transaction numbers, receipt numbers

2. CHASSIS / VIN NUMBER
   - Standard VIN: exactly 17 alphanumeric chars
   - Indian short chassis: 6-15 alphanumeric chars
   - Return ONLY alphanumeric, strip all symbols

Return ONLY this JSON, no markdown, no extra text:
{
  "isVehicleDocument": true or false,
  "documentType": "RC Book" or "RTO Receipt" or "Invoice" or "Insurance" or "Challan" or "Other Vehicle Doc" or "Not Vehicle",
  "chassisNumber": "value" or null,
  "registrationNumber": "value without spaces" or null,
  "chassisValid": true or false,
  "registrationValid": true or false,
  "confidence": "low" or "medium" or "high",
  "reason": "one line explanation"
}`;

async function callGeminiWithFallback(apiKey, base64, mimeType) {
    let lastError = null;

    for (const model of MODELS_TO_TRY) {
        try {
            console.log('Trying model:', model);

            const response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/' +
                model + ':generateContent?key=' + apiKey,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { inline_data: { mime_type: mimeType, data: base64 } },
                                { text: PROMPT }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0,
                            maxOutputTokens: 600
                        }
                    })
                }
            );

            const data = await response.json();

            if (response.ok && data.candidates) {
                console.log('Success with model:', model);
                return { data, model };
            }

            if (data.error?.message?.includes('not found') ||
                data.error?.message?.includes('not supported') ||
                data.error?.message?.includes('deprecated')) {
                console.log('Model not available:', model, '- trying next');
                lastError = data.error?.message;
                continue;
            }

            // Other error - return immediately
            return { error: data.error?.message || 'Unknown error', model };

        } catch (err) {
            lastError = err.message;
            continue;
        }
    }

    return { error: 'No models available. Last error: ' + lastError };
}

export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            status: 'error',
            error: 'API key not configured'
        });
    }

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey
        );
        const data = await response.json();
        const modelNames = data.models?.map(m => m.name) || [];

        return NextResponse.json({
            status: 'Gemini route working',
            keyConfigured: true,
            availableModels: modelNames
        });
    } catch (err) {
        return NextResponse.json({
            status: 'error',
            error: err.message
        });
    }
}

export async function POST(request) {
    try {
        const { base64, mimeType } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not set in .env.local' },
                { status: 500 }
            );
        }

        if (!base64 || !mimeType) {
            return NextResponse.json(
                { error: 'Missing base64 or mimeType in request.' },
                { status: 400 }
            );
        }

        const result = await callGeminiWithFallback(apiKey, base64, mimeType);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        const rawText = result.data.candidates[0]?.content?.parts?.[0]?.text || '';
        const clean = rawText.replace(/```json|```/g, '').trim();

        try {
            const parsed = JSON.parse(clean);
            return NextResponse.json({ ...parsed, modelUsed: result.model });
        } catch {
            return NextResponse.json({
                error: 'JSON parse failed',
                raw: clean,
                modelUsed: result.model
            }, { status: 500 });
        }

    } catch (err) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
