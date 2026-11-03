/* MyLife – odczyt tekstu ze zdjęcia, w osobnym wątku (v26: PaddleOCR PP-OCRv4 zamiast Tesseract).
   Silnik: ONNX Runtime Web 1.20 (WebAssembly z SIMD, 1 wątek) + modele PaddleOCR PP-OCRv4 z lib/paddle/:
   det.onnx (wykrywanie obszarów tekstu, mapa prawdopodobieństwa) i rec.onnx (rozpoznawanie wiersza, CTC; słownik keys.txt).
   Przygotowanie obrazów i składanie wyniku – body-ocr.js (wątek główny), tu tylko uruchamianie modeli.
   Wiadomości:
     { id }                                      -> { id, ok: true }                 (uruchomienie – wczytanie modeli)
     { id, op: 'det', data: Float32Array, h, w } -> { id, prob: Float32Array, h, w } (mapa 1×1×h×w)
     { id, op: 'rec', data: Float32Array, n, w } -> { id, idx: Int32Array, prob: Float32Array, t } (argmax CTC na krok)
     błąd: { id, error } */
'use strict';
let ready = null;
function init() {
  if (ready) return ready;
  ready = (async () => {
    importScripts('lib/paddle/ort.wasm.min.js');
    self.ort.env.wasm.wasmPaths = new URL('lib/paddle/', self.location.href).href;
    self.ort.env.wasm.numThreads = 1;   // bez SharedArrayBuffer – działa w zwykłej PWA
    const opt = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
    const det = await self.ort.InferenceSession.create('lib/paddle/det.onnx', opt);
    const rec = await self.ort.InferenceSession.create('lib/paddle/rec.onnx', opt);
    return { det, rec };
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

self.onmessage = async (ev) => {
  const m = ev.data || {}, id = m.id;
  try {
    const { det, rec } = await init();
    if (!m.op) { self.postMessage({ id, ok: true }); return; }
    if (m.op === 'det') {
      const x = new self.ort.Tensor('float32', m.data, [1, 3, m.h, m.w]);
      const out = await det.run({ [det.inputNames[0]]: x });
      const t = out[det.outputNames[0]];
      const prob = new Float32Array(t.data);   // [1, 1, h, w]
      self.postMessage({ id, prob, h: t.dims[2], w: t.dims[3] }, [prob.buffer]);
      return;
    }
    if (m.op === 'rec') {
      const x = new self.ort.Tensor('float32', m.data, [m.n, 3, 48, m.w]);
      const out = await rec.run({ [rec.inputNames[0]]: x });
      const t = out[rec.outputNames[0]], d = t.data, n = t.dims[0], T = t.dims[1], C = t.dims[2];
      // argmax na każdym kroku czasu (wynik modelu to już prawdopodobieństwa – softmax w modelu)
      const idx = new Int32Array(n * T), prob = new Float32Array(n * T);
      for (let i = 0; i < n * T; i++) {
        let bi = 0, bv = -Infinity;
        const o = i * C;
        for (let c = 0; c < C; c++) { const v = d[o + c]; if (v > bv) { bv = v; bi = c; } }
        idx[i] = bi; prob[i] = bv;
      }
      self.postMessage({ id, idx, prob, t: T }, [idx.buffer, prob.buffer]);
      return;
    }
    throw new Error('Nieznane polecenie odczytu.');
  } catch (e) {
    self.postMessage({ id, error: String((e && e.message) || e) });
  }
};
