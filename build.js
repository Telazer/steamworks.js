const path = require('node:path');
const fs = require('node:fs');
const child_process = require('node:child_process');

const targets = {
    ['x86_64-pc-windows-msvc']: {
        folder: 'win64',
        files: ['steam_api64.dll', 'steam_api64.lib'],
        platform: 'win32',
        arch: 'x64'
    },
    ['x86_64-unknown-linux-gnu']: {
        folder: 'linux64',
        files: ['libsteam_api.so'],
        platform: 'linux',
        arch: 'x64'
    },
    ['x86_64-apple-darwin']: {
        folder: 'osx',
        files: ['libsteam_api.dylib'],
        platform: 'darwin',
        arch: 'x64'
    },
    ['aarch64-apple-darwin']: {
        folder: 'osx',
        files: ['libsteam_api.dylib'],
        platform: 'darwin',
        arch: 'arm64'
    }
}

// Check if we want to build for all targets or just the current one
const buildAll = process.argv.includes('--all');
let targetsToBuild = [];

if (buildAll) {
    // Build all targets
    targetsToBuild = Object.entries(targets);
} else {
    // Build only the specified target or the current platform
    const specifiedTarget = process.argv.at(-1);
    if (targets[specifiedTarget]) {
        targetsToBuild = [[specifiedTarget, targets[specifiedTarget]]];
    } else {
        const currentTarget = Object.values(targets).find(t => t.platform === process.platform && t.arch === process.arch);
        if (currentTarget) {
            const targetKey = Object.keys(targets).find(key => targets[key] === currentTarget);
            targetsToBuild = [[targetKey, currentTarget]];
        }
    }
}

// Function to build a specific target
function buildTarget(targetKey, target) {
    if (!target) {
        console.error(`Target not found: ${targetKey}`);
        return Promise.resolve();
    }

    console.log(`Building for target: ${targetKey}`);

    const dist = path.join(__dirname, 'dist', target.folder);
    const redist = path.join(__dirname, 'sdk/redistributable_bin', target.folder);

    target.files.forEach(file => {
        const [source, dest] = [path.join(redist, file), path.join(dist, file)];
        try { fs.mkdirSync(path.dirname(dest), { recursive: true }); } catch { }
        fs.copyFileSync(source, dest);
    });

    const relative = path.relative(process.cwd(), dist);
    const params = [
        'build',
        '--platform',
        '--no-dts-header',
        '--js', 'false',
        '--dts', '../../client.d.ts',
        relative
    ];

    // Add any additional arguments except --all
    const additionalArgs = process.argv.slice(2).filter(arg => arg !== '--all');
    if (additionalArgs.length > 0) {
        params.push(additionalArgs.join(' '));
    }

    return new Promise((resolve, reject) => {
        child_process.spawn('napi', params, { stdio: 'inherit', shell: true })
            .on('exit', err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
}

// Build targets sequentially
async function buildTargets() {
    for (const [key, target] of targetsToBuild) {
        try {
            await buildTarget(key, target);
        } catch (err) {
            console.error(`Error building target ${key}:`, err);
            process.exit(1);
        }
    }
}

buildTargets();
