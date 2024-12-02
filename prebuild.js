require('dotenv').config();

const fs = require('fs');
const path = require('path');

function copyIcon(src, dst) {
    if (!src) {
        console.warn(`Icon path for ${dst} is not defined in your environment variables`);
        return;
    }
    console.log(`Replacing icon ${dst} by ${src}`);
    if (!fs.existsSync(src)) {
        console.warn(`Icon file ${src} does not exist.`);
        return;
    }

    const destPath = path.join(__dirname, 'assets', dst);

    try {
        fs.copyFileSync(src, destPath);
        fs.chmodSync(destPath, 0o644);
    } catch(e) {
        console.warn(`Failed to copy logo ${e}`);
    }
}

function updatePackageJson() {
    const placeholders = {
        EXTENSION_NAME: process.env.EXTENSION_NAME || "devchat",
        PUBLISHER: process.env.PUBLISHER || "merico",
        ASSISTANT_NAME_EN: process.env.ASSISTANT_NAME_EN || "DevChat",
        ASSISTANT_NAME_ZH: process.env.ASSISTANT_NAME_ZH || "DevChat"
    }
    console.log(`Updating package.json, env: ${JSON.stringify(placeholders)}`);

    let packageJson = fs.readFileSync('package.json', 'utf8');

    // Replace placeholders
    Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        packageJson = packageJson.replace(regex, value);
    });

    fs.writeFileSync('package.json', packageJson);
}

copyIcon(process.env.EXTENSION_ICON, 'devchat.png');
copyIcon(process.env.SIDEBAR_ICON, 'devchat_icon.svg');
copyIcon(process.env.DIFF_APPLY_ICON, 'devchat_apply.svg');

updatePackageJson();