/** Single-threaded core: must use ESM build for @ffmpeg/ffmpeg's module worker (see worker.js load). */
/** importScripts(UMD) often throws in a module worker; the fallback import() needs export default — only in ESM. */
import corePath from '@ffmpeg/core?url';
import wasmPath from '@ffmpeg/core/wasm?url';

export const stCoreUrls = { corePath, wasmPath };
