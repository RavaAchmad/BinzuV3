import { promises } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const AUDIO_CODEC = 'libmp3lame';
const VIDEO_CODEC = 'libx264';
const OPUS_CODEC = 'libopus';
const GIF_CODEC = 'fps=15,scale=512:-1:flags=lanczos';

async function writeFile(tmp, buffer) {
	try {
		await promises.mkdir(path.dirname(tmp), { recursive: true });
		await promises.writeFile(tmp, buffer);
	} catch (error) {
		throw new Error(`Gagal menulis file: ${error.message}`);
	}
}

async function ffmpeg(buffer, args, ext, ext2) {
	const __dirname = dirname(fileURLToPath(import.meta.url))
	const tmp = path.join(__dirname, '../tmp', +new Date + '.' + ext);
	const out = tmp + '.' + ext2;

	try {
		await writeFile(tmp, buffer);

		const ffmpegProcess = spawn('ffmpeg', ['-y', '-i', tmp, ...args, out]);

		// Tangkap stderr biar tau detail error kalau gagal
		let stderrLog = ''
		ffmpegProcess.stderr.on('data', (data) => {
			stderrLog += data.toString()
		})

		await new Promise((resolve, reject) => {
			ffmpegProcess.on('error', (err) => {
				if (err.code === 'ENOENT') {
					reject(new Error('FFmpeg tidak terinstall! Jalankan: apt install ffmpeg'))
				} else {
					reject(new Error(`FFmpeg gagal start: ${err.message}`))
				}
			})
			ffmpegProcess.on('close', (code) => {
				if (code !== 0) {
					// Ambil 5 baris terakhir stderr — biasanya berisi pesan error utama
					const errLines = stderrLog.trim().split('\n').slice(-5).join('\n')
					reject(new Error(`FFmpeg exit code ${code}:\n${errLines}`))
				} else {
					resolve()
				}
			})
		})

		const result = await promises.readFile(out)
		return {
			data: result,
			filename: out,
			delete: async () => {
				try { await promises.unlink(out) } catch (_) {}
				try { await promises.unlink(tmp) } catch (_) {}
			}
		}
	} catch (error) {
		// Cleanup file temp kalau gagal
		try { await promises.unlink(tmp) } catch (_) {}
		try { await promises.unlink(out) } catch (_) {}
		throw error
	}
}

async function toAudio(buffer, ext) {
	return ffmpeg(buffer, [
		'-vn',
		'-c:a', AUDIO_CODEC,
		'-b:a', '128k',
		'-ar', '44100',
		'-ac', '2',
		'-f', 'mp3',
	], ext, 'mp3');
}

async function toPTT(buffer, ext) {
	return ffmpeg(buffer, [
		'-vn',
		'-c:a', OPUS_CODEC,
		'-b:a', '96k',
		'-vbr', 'on',
		'-ar', '48000',
		'-ac', '1',
		'-f', 'ogg',
	], ext, 'ogg');
}

async function toGif(buffer, ext) {
	return ffmpeg(buffer, [
		'-vf', GIF_CODEC,
		'-loop', '0',
		'-fs', '256k',
		'-c:v', 'gif',
	], ext, 'gif');
}

async function toVideo(buffer, ext) {
	return ffmpeg(buffer, [
		'-c:v', VIDEO_CODEC,
		'-c:a', 'aac',
		'-b:a', '128k',
		'-ar', '44100',
		'-crf', '32',
		'-preset', 'slow',
	], ext, 'mp4');
}

async function toStickerImage(buffer, ext) {
	return ffmpeg(buffer, [
		'-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000',
		'-c:v', 'png',
	], ext, 'png');
}

async function toStickerVideo(buffer, ext) {
	return ffmpeg(buffer, [
		'-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white',
		'-c:v', 'libx264',
		'-preset', 'fast',
		'-crf', '28',
		'-c:a', 'aac',
		'-b:a', '128k',
		'-ar', '44100',
		'-t', '15',
		'-f', 'mp4'
	], ext, 'mp4');
}

export {
	toAudio,
	toPTT,
	toVideo,
	toGif,
	toStickerImage,
	toStickerVideo,
	ffmpeg
};