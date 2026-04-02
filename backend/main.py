from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import smtplib
from email.message import EmailMessage
from contextlib import asynccontextmanager
from pydantic import BaseModel
import os
import json
import asyncio
import logging
import numpy as np
from scipy.ndimage import gaussian_filter1d
import joblib
from google import genai
from groq import Groq as GroqClient
from dotenv import load_dotenv
import math
import time
import random

load_dotenv()

# ---------------------------------------------------------------------------
# Global variables
# ---------------------------------------------------------------------------
global_simulator = None
active_websockets = []
csi_simulation_task = None
alert_recipient_email = os.getenv("CARETAKER_EMAIL")  # Default/fallback
force_fall_event = False

# Nearby Users Global State
active_users = {} # user_id -> { lat, lng, last_seen, avatar_seed }

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # radius of Earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# Webpage Summarization state (Hugging Face Persistent Storage Support)
DATA_DIR = "/data" if os.path.exists("/data") else os.path.dirname(__file__)
SUMMARIES_FILE = os.path.join(DATA_DIR, "webpage_summaries.json")

def _load_summaries() -> dict:
    try:
        with open(SUMMARIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_summaries():
    try:
        with open(SUMMARIES_FILE, "w", encoding="utf-8") as f:
            json.dump(webpage_summaries, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not save summaries: {e}")

webpage_summaries = _load_summaries()

# ---------------------------------------------------------------------------
# Aegis Configuration & Model Setup
# ---------------------------------------------------------------------------
NUM_SUBCARRIERS = 20
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_FILE = os.path.join(MODEL_DIR, "fall_detector_ann.joblib")
SCALER_FILE = os.path.join(MODEL_DIR, "scaler.joblib")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aegis")

try:
    ann_model = joblib.load(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    logger.info("✅ ANN model and scaler loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load model: {e}")
    ann_model = None
    scaler = None

# Init Gemini Client (for prescription image extraction only)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Init Groq Client (for webpage summarization + chat)
groq_client = GroqClient(api_key=os.getenv("GROQ_API_KEY"))

# ---------------------------------------------------------------------------
# Component Definitions (Simulation, Inference, Alerting)
# ---------------------------------------------------------------------------
def extract_features(signal: np.ndarray) -> np.ndarray:
    features = []
    window_size, num_sc = signal.shape

    for sc in range(num_sc):
        col = signal[:, sc]
        mean = np.mean(col)
        std = np.std(col)
        maximum = np.max(col)
        minimum = np.min(col)

        if std > 1e-8:
            skew = float(np.mean(((col - mean) / std) ** 3))
            kurt = float(np.mean(((col - mean) / std) ** 4) - 3.0)
        else:
            skew = 0.0
            kurt = 0.0

        features.extend([mean, std, maximum, minimum, skew, kurt])

    # Global features
    overall_var = float(np.var(signal))
    deltas = np.diff(signal, axis=0)
    max_delta = float(np.max(np.abs(deltas)))
    energy = float(np.sum(signal ** 2) / (window_size * num_sc))

    mean_signal = np.mean(signal, axis=1)
    centered = mean_signal - np.mean(mean_signal)
    zcr = float(np.sum(np.abs(np.diff(np.sign(centered)))) / (2 * len(centered)))

    features.extend([overall_var, max_delta, energy, zcr])
    return np.array(features).reshape(1, -1)


class CSIStreamSimulator:
    def __init__(self):
        self.tick = 0
        self.subcarrier_means = np.linspace(22, 32, NUM_SUBCARRIERS)
        self.phase_offsets = np.random.uniform(0, 2 * np.pi, NUM_SUBCARRIERS)
        self.drift_freqs = np.random.uniform(0.2, 0.5, NUM_SUBCARRIERS)
        self.drift_amps = np.random.uniform(0.5, 1.5, NUM_SUBCARRIERS)

        self.is_walking = False
        self.walk_start = 0
        self.walk_duration = 0

        self.falling = False
        self.fall_tick_start = 0
        self.fall_duration = 15
        self.fall_amplitudes = np.random.uniform(15, 35, NUM_SUBCARRIERS)
        self.post_fall_offset = np.random.uniform(-5, 5, NUM_SUBCARRIERS)

        self.window_buffer = np.zeros((50, NUM_SUBCARRIERS))
        self.buffer_idx = 0

    def trigger_fall(self):
        if not self.falling:
            self.falling = True
            self.fall_tick_start = self.tick
            self.fall_amplitudes = np.random.uniform(15, 35, NUM_SUBCARRIERS)
            self.post_fall_offset = np.random.uniform(-5, 5, NUM_SUBCARRIERS)
            logger.info("🚨 Fall event triggered!")

    def generate_frame(self) -> np.ndarray:
        self.tick += 1
        t = self.tick * 0.1

        frame = np.copy(self.subcarrier_means)

        for sc in range(NUM_SUBCARRIERS):
            frame[sc] += self.drift_amps[sc] * np.sin(self.drift_freqs[sc] * t + self.phase_offsets[sc])

        noise = np.random.randn(NUM_SUBCARRIERS) * 1.5
        noise = gaussian_filter1d(noise, sigma=1.0)
        frame += noise

        if not self.is_walking and np.random.random() < 0.003:
            self.is_walking = True
            self.walk_start = self.tick
            self.walk_duration = np.random.randint(100, 200)

        if self.is_walking:
            if self.tick - self.walk_start > self.walk_duration:
                self.is_walking = False
            else:
                for sc in range(NUM_SUBCARRIERS):
                    walk_amp = 2.5 + sc * 0.1
                    frame[sc] += walk_amp * np.sin(1.0 * t + self.phase_offsets[sc])

        if self.falling:
            elapsed = self.tick - self.fall_tick_start
            if elapsed < self.fall_duration:
                t_fall = elapsed / self.fall_duration * 3.0
                for sc in range(NUM_SUBCARRIERS):
                    impulse = self.fall_amplitudes[sc] * np.exp(-0.5 * ((t_fall - 0.5) / 0.3) ** 2) * np.cos(6 * t_fall)
                    frame[sc] += impulse
            elif elapsed < self.fall_duration + 50:
                frame += self.post_fall_offset
            else:
                self.falling = False

        idx = self.buffer_idx % 50
        self.window_buffer[idx] = frame
        self.buffer_idx += 1

        return frame

    def get_window(self) -> np.ndarray:
        if self.buffer_idx < 50:
            return self.window_buffer[: self.buffer_idx]
        idx = self.buffer_idx % 50
        return np.vstack([self.window_buffer[idx:], self.window_buffer[:idx]])


def send_fall_alert_email():
    sender = os.getenv("SENDER_EMAIL")
    password = os.getenv("SENDER_PASSWORD")
    recipient = alert_recipient_email

    if not sender or not password or not recipient:
        logger.warning(f"Email credentials missing or recipient not set (recipient: {recipient}). Skipping email alert.")
        return

    msg = EmailMessage()
    msg.set_content("URGENT: A fall has been detected by the Aegis system. Please check on the patient immediately.")
    msg['Subject'] = '🚨 ALERT: Fall Detected'
    msg['From'] = sender
    msg['To'] = recipient

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
        server.quit()
        logger.info(f"📧 Fall alert email sent to {recipient}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

async def send_email_async():
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_fall_alert_email)

async def run_csi_simulation_loop():
    global global_simulator, force_fall_event
    global_simulator = CSIStreamSimulator()
    auto_fall_counter = 0
    has_sent_email_for_this_fall = False

    while True:
        if force_fall_event:
            global_simulator.trigger_fall()
            force_fall_event = False

        auto_fall_counter += 1
        if auto_fall_counter >= 150 and not global_simulator.falling:
            global_simulator.trigger_fall()
            auto_fall_counter = 0

        frame = global_simulator.generate_frame()
        subcarriers = frame.tolist()

        prediction = "NO_FALL"
        confidence = 0.0
        variance = float(np.var(frame))

        if global_simulator.buffer_idx >= 50 and ann_model is not None and scaler is not None:
            try:
                window = global_simulator.get_window()
                features = extract_features(window)
                features_scaled = scaler.transform(features)

                pred = ann_model.predict(features_scaled)[0]
                proba = ann_model.predict_proba(features_scaled)[0]

                prediction = "FALL" if pred == 1 else "NO_FALL"
                confidence = float(max(proba))
            except Exception as e:
                logger.error(f"Inference error: {e}")

        if prediction == "FALL" and not has_sent_email_for_this_fall:
            asyncio.create_task(send_email_async())
            has_sent_email_for_this_fall = True
        elif prediction == "NO_FALL":
            has_sent_email_for_this_fall = False

        payload = {
            "subcarriers": [round(v, 2) for v in subcarriers],
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "variance": round(variance, 2),
        }

        disconnected = []
        for ws in active_websockets:
            try:
                await ws.send_text(json.dumps(payload))
            except:
                disconnected.append(ws)
        
        for ws in disconnected:
            active_websockets.remove(ws)

        await asyncio.sleep(0.1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CSI Simulator loop...")
    task = asyncio.create_task(run_csi_simulation_loop())
    yield
    task.cancel()


# ---------------------------------------------------------------------------
# FastAPI App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(title="CareSync & Aegis Fall Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/nearby-users")
def get_nearby_users(lat: float, lng: float, radius: float = 10, user_id: str = None):
    # If a user is actively calling this, store their presence
    if user_id:
        if user_id not in active_users:
            active_users[user_id] = {"avatar_seed": random.randint(1, 100)}
        active_users[user_id].update({"lat": lat, "lng": lng, "last_seen": time.time()})
    
    # Prune inactive users (e.g., > 5 mins)
    current_time = time.time()
    for uid in list(active_users.keys()):
        if current_time - active_users[uid].get("last_seen", current_time) > 300:
            del active_users[uid]
            
    # Find nearby users
    nearby = []
    for uid, data in active_users.items():
        if user_id and uid == user_id:
            continue  # Don't return self
            
        dist = haversine(lat, lng, data.get("lat", 0), data.get("lng", 0))
        if dist <= radius:
            nearby.append({
                "id": uid,
                "position": {"lat": data["lat"], "lng": data["lng"]},
                "avatarSeed": data["avatar_seed"],
                "distance": dist
            })
    return nearby

class AlertConfig(BaseModel):
    email: str

@app.post("/api/set-alert-email")
def set_alert_email(config: AlertConfig):
    global alert_recipient_email
    alert_recipient_email = config.email
    logger.info(f"Emergency alert email dynamically set to: {alert_recipient_email}")
    return {"status": "success", "message": "Alert email updated", "email": alert_recipient_email}

# ---------------------------------------------------------------------------
# Webpage Summarization (Extension Integration)
# ---------------------------------------------------------------------------
class WebpageData(BaseModel):
    userId: str
    text: str
    inputs: list[dict]
    buttons: list[str]

@app.post("/api/analyze-webpage")
async def analyze_webpage(data: WebpageData):
    webpage_summaries[data.userId] = {"status": "processing", "summary": ""}
    
    # Process asynchronously to return immediately for polling
    asyncio.create_task(process_webpage_summary(data))
    return {"status": "processing"}

async def process_webpage_summary(data: WebpageData):
    try:
        sys_prompt = "You are a concise AI assistant. Summarize the following webpage content in 1-3 short paragraphs, focusing on its core purpose, key topics, and main entities. Be clear and factual."
        # Use Groq (llama-3.3-70b-versatile) for fast summarization
        loop = asyncio.get_event_loop()
        def _groq_summarize():
            return groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": "Webpage Content:\n" + data.text[:6000]}
                ],
                temperature=0.3,
                max_tokens=512,
            )
        response = await loop.run_in_executor(None, _groq_summarize)
        summary = response.choices[0].message.content.strip()
        webpage_summaries[data.userId] = {"status": "done", "summary": summary}
        _save_summaries()  # Persist so restarts don't lose data
    except Exception as e:
        logger.error(f"Error summarizing webpage with Groq: {e}")
        webpage_summaries[data.userId] = {"status": "done", "summary": "Failed to generate summary."}
        _save_summaries()

@app.get("/api/webpage-summary/{user_id}")
async def get_webpage_summary(user_id: str):
    return webpage_summaries.get(user_id, {"status": "done", "summary": "No data found for this user."})

# ---------------------------------------------------------------------------
# Contextual Chat Endpoints (Groq-powered)
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    context_type: str   # "prescription" or "webpage"
    context: str        # Serialized context (JSON string or plain text summary)
    messages: list[ChatMessage]

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        if request.context_type == "prescription":
            system_prompt = (
                "You are a helpful, empathetic medical assistant integrated into a prescription analysis app. "
                "The user has scanned a medical document and you have the extracted prescription data below. "
                "Answer the user's questions ONLY based on this prescription context. "
                "Be clear, concise, and always recommend consulting a licensed doctor for medical decisions.\n\n"
                f"=== PRESCRIPTION DATA ===\n{request.context}\n=== END DATA ==="
            )
        else:  # webpage
            system_prompt = (
                "You are an intelligent reading assistant integrated into a web summarizer app. "
                "The user has extracted content from a webpage and you have the AI-generated summary below. "
                "Answer the user's questions ONLY based on this webpage context. "
                "Be clear, conversational, and concise.\n\n"
                f"=== WEBPAGE SUMMARY ===\n{request.context}\n=== END SUMMARY ==="
            )

        groq_messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            groq_messages.append({"role": msg.role, "content": msg.content})

        loop = asyncio.get_event_loop()
        def _groq_chat():
            return groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=groq_messages,
                temperature=0.5,
                max_tokens=600,
            )
        response = await loop.run_in_executor(None, _groq_chat)
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

# ---------------------------------------------------------------------------
# Translation Endpoint (Groq-powered, for multilingual TTS)
# ---------------------------------------------------------------------------
class TranslateRequest(BaseModel):
    text: str
    target_language: str  # e.g. "Kannada", "Hindi"

@app.post("/api/translate")
async def translate_text(request: TranslateRequest):
    try:
        loop = asyncio.get_event_loop()
        def _translate():
            return groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"You are a professional translator. Translate the following text accurately into {request.target_language}. "
                            "Output ONLY the translated text — no explanations, no labels, no extra formatting."
                        )
                    },
                    {"role": "user", "content": request.text}
                ],
                temperature=0.1,
                max_tokens=1024,
            )
        response = await loop.run_in_executor(None, _translate)
        translated = response.choices[0].message.content.strip()
        return {"translated_text": translated, "target_language": request.target_language}
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

# ---------------------------------------------------------------------------
# Text-to-Speech Endpoint (Groq playai-tts — neural quality voice)
# ---------------------------------------------------------------------------
from fastapi.responses import Response as FastAPIResponse

class TTSRequest(BaseModel):
    text: str
    voice: str = "hannah"  # Valid Orpheus voices: autumn, diana, hannah, austin, daniel, troy

def _split_for_orpheus(text: str, max_chars: int = 190) -> list[str]:
    """Split text into chunks ≤200 chars on sentence/word boundaries."""
    import re
    sentences = re.split(r'(?<=[.!?,;])\s+', text.strip())
    chunks, current = [], ""
    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        if len(sent) > max_chars:
            # Hard-split oversized sentence on word boundary
            words = sent.split()
            for word in words:
                if len(current) + len(word) + 1 <= max_chars:
                    current = (current + " " + word).strip()
                else:
                    if current:
                        chunks.append(current)
                    current = word
        elif len(current) + len(sent) + 1 <= max_chars:
            current = (current + " " + sent).strip()
        else:
            if current:
                chunks.append(current)
            current = sent
    if current:
        chunks.append(current)
    return chunks

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Groq Orpheus TTS — supports up to 200 chars per chunk.
    We split long text into sentence-aware chunks and concatenate the WAV bytes.
    Valid voices: autumn, diana, hannah, austin, daniel, troy
    """
    try:
        import httpx
        import struct

        groq_api_key = os.getenv("GROQ_API_KEY", "")
        chunks = _split_for_orpheus(request.text)
        if not chunks:
            raise HTTPException(status_code=400, detail="Empty text")

        async def fetch_chunk(http: httpx.AsyncClient, chunk: str) -> bytes:
            resp = await http.post(
                "https://api.groq.com/openai/v1/audio/speech",
                headers={"Authorization": f"Bearer {groq_api_key}", "Content-Type": "application/json"},
                json={"model": "canopylabs/orpheus-v1-english", "voice": request.voice, "input": chunk, "response_format": "wav"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=503, detail=f"TTS chunk failed: {resp.text[:200]}")
            return resp.content

        async with httpx.AsyncClient(timeout=60.0) as http:
            # Fetch all chunks (sequentially to avoid rate limits)
            audio_parts: list[bytes] = []
            for chunk in chunks:
                part = await fetch_chunk(http, chunk)
                audio_parts.append(part)

        if len(audio_parts) == 1:
            combined = audio_parts[0]
        else:
            # Concatenate WAV: keep header from first chunk, append PCM data from all
            def wav_data(wav_bytes: bytes) -> bytes:
                # WAV data starts at byte 44 (standard PCM header)
                return wav_bytes[44:]

            header = audio_parts[0][:44]
            pcm = b"".join(wav_data(p) for p in audio_parts)
            # Update chunk size fields in header
            total_size = 36 + len(pcm)
            header = (header[:4] + struct.pack('<I', total_size) +
                      header[8:40] + struct.pack('<I', len(pcm)) + header[44:])
            combined = header + pcm

        return FastAPIResponse(
            content=combined,
            media_type="audio/wav",
            headers={"Cache-Control": "no-store"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

# ---------------------------------------------------------------------------
# Medical Document Analysis
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    base64_image: str
    mime_type: str = "image/jpeg"

prompt = """
[ROLE]
You are a highly precise Medical Document Analyst and Patient Care Coordinator. Your goal is to deeply analyze medical reports (including messy OCR text, handwritten notes, and edge annotations) and extract a comprehensive, actionable schedule while maintaining 100% factual accuracy.

[CONTEXT]
I am building a mobile app that scans medical reports. Patients struggle to understand exactly when and where to take their medications, and need a system that flags activities that contradict their doctor's orders.

[TASK]
Please analyze the provided medical report image thoroughly. Do not miss any details or edge notes. Output a strictly formatted JSON object with the following three sections:

1. "medicationSchedule": A chronological list of medications. 
   - CRITICAL: Do NOT duplicate the same medicine entry for the same time. Consolidate entries if a medicine is taken multiple times (e.g., list it once with "timeOfDay": "Morning and Evening", or create distinct unique entries for different times).
   - Must include: "medicineName", "dosage", specific "timeOfDay" (e.g., "7:00 AM" or "Twice daily"), and "instructions" (e.g., "with food", "apply to left knee").
2. "locations": A list of specific environments or clinic locations mentioned for procedures or actions, with "action" and "location" (e.g., "At home", "Clinical setting"). Default to "Home" if unspecified but implied.
3. "safetyGuardrails": A comprehensive list of "rule" constraints or Prohibited Actions (e.g., "Do not consume alcohol", "Avoid heavy lifting"). These serve as Alert Triggers.

[CONSTRAINTS & FORMATTING]
- Strict Accuracy & Exhaustiveness: Extract every medicine, but ensure there are no duplicate/redundant entries in the medication schedule. Do not guess dosages. 
- Output ONLY valid JSON matching the exact keys provided above. Start immediately with { and end with }. Do not add markdown code blocks.
"""

@app.post("/api/analyze")
async def analyze_document(request: AnalyzeRequest):
    if not request.base64_image:
        raise HTTPException(status_code=400, detail="base64_image is required")

    try:
        import base64
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, genai.types.Part.from_bytes(
                data=base64.b64decode(request.base64_image),
                mime_type=request.mime_type
            )],
            config=genai.types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        with open("output.md", "w", encoding="utf-8") as f:
            f.write(response.text)

        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
            if text.endswith('```'):
                text = text[:-3]
        elif text.startswith('```'):
            text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
                
        parsed_data = json.loads(text.strip())
        return parsed_data
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse the JSON response from the API.")

@app.get("/health")
def read_health():
    return {"status": "ok"}

@app.websocket("/")
async def websocket_root(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    logger.info("🔗 Client connected via WebSocket for CSI monitoring")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("🔌 Client disconnected")
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_websockets:
            active_websockets.remove(websocket)

@app.post("/demo-trigger-fall")
async def demo_trigger_fall():
    global force_fall_event
    force_fall_event = True
    logger.info("🔴 Fall trigger received via REST API")
    return {"status": "CRITICAL", "message": "Fall event injected into CSI stream"}
