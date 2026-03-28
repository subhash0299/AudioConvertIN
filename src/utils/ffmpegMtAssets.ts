/** Chunk loaded only when multi-threaded core is used (requires COOP/COEP). */
// Must use UMD builds: package "import" points at ESM with import.meta, which pthread workers
// load via importScripts() — that API cannot run ESM (see ffmpeg-core.worker.js handleMessage).
import corePath from '../../node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.js?url';
import wasmPath from '../../node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.wasm?url';
import workerPath from '../../node_modules/@ffmpeg/core-mt/dist/umd/ffmpeg-core.worker.js?url';

export const mtCoreUrls = { corePath, wasmPath, workerPath };
