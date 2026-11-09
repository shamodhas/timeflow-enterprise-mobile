const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/expo-modules-autolinking/build/utils.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  const faulty = `const maybeRealpath = async (target) => {
    try {
        return await fs_1.default.promises.realpath(target);
    }
    catch {
        return null;
    }
};`;

  const fixed = `const maybeRealpath = async (target) => {
    try {
        return await fs_1.default.promises.realpath(target);
    }
    catch {
        try {
            await fs_1.default.promises.access(target);
            return path_1.default.resolve(target);
        } catch {
            return null;
        }
    }
};`;

  if (content.includes(faulty)) {
    content = content.replace(faulty, fixed);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch-autolinking] Successfully patched expo-modules-autolinking for Windows EPERM realpath.');
  } else {
    console.log('[patch-autolinking] expo-modules-autolinking already patched or target signature changed.');
  }
}

