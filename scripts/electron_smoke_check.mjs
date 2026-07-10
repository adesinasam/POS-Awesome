import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ELECTRON_ARTIFACT_EXTENSIONS = new Set([".exe", ".msi", ".AppImage", ".dmg", ".zip"]);

async function requireFile(filePath, label) {
	let fileStat;
	try {
		fileStat = await stat(filePath);
	} catch (error) {
		throw new Error(`Missing ${label}: ${filePath}`, { cause: error });
	}
	if (!fileStat.isFile() || fileStat.size === 0) {
		throw new Error(`Invalid ${label}: ${filePath}`);
	}
}

async function listElectronArtifacts(distDir) {
	try {
		const entries = await readdir(distDir, { withFileTypes: true });
		const artifacts = [];
		for (const entry of entries) {
			if (!entry.isFile()) continue;
			if (ELECTRON_ARTIFACT_EXTENSIONS.has(path.extname(entry.name))) {
				artifacts.push(path.join(distDir, entry.name));
			}
		}
		return artifacts;
	} catch {
		return [];
	}
}

export async function verifyElectronPackage({ rootDir = process.cwd(), requireArtifact = false } = {}) {
	const packagePath = path.resolve(rootDir, "package.json");
	await requireFile(packagePath, "package.json");

	const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
	const mainPath = packageJson.main;
	if (typeof mainPath !== "string" || !mainPath.trim()) {
		throw new Error("package.json must define an Electron main entry");
	}
	await requireFile(path.resolve(rootDir, mainPath), "Electron main entry");

	const buildConfig = packageJson.build || {};
	if (buildConfig.appId !== "com.posawesome.desktop") {
		throw new Error("package.json build.appId must remain com.posawesome.desktop");
	}
	if (!buildConfig.directories?.output) {
		throw new Error("package.json build.directories.output is required");
	}

	const distDir = path.resolve(rootDir, buildConfig.directories.output);
	const artifacts = await listElectronArtifacts(distDir);
	if (requireArtifact && artifacts.length === 0) {
		throw new Error(`No Electron package artifact found in ${distDir}`);
	}
	for (const artifact of artifacts) {
		await requireFile(artifact, "Electron package artifact");
	}

	return {
		mainPath,
		distDir,
		artifacts,
	};
}

async function main() {
	const requireArtifact = process.argv.includes("--require-artifact");
	const result = await verifyElectronPackage({ requireArtifact });
	console.log(`Verified Electron package config (${result.mainPath})`);
	if (requireArtifact) {
		console.log(`Verified ${result.artifacts.length} Electron package artifact(s)`);
	}
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
