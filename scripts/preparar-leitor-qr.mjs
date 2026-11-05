import { copyFileSync, mkdirSync } from 'node:fs'
mkdirSync('public/vendor', { recursive: true })
copyFileSync('node_modules/jsqr/dist/jsQR.js', 'public/vendor/jsQR.js')
copyFileSync('node_modules/jsqr/LICENSE', 'public/vendor/jsQR.LICENSE')
copyFileSync('node_modules/three/build/three.module.js', 'public/vendor/three.module.js')
copyFileSync('node_modules/three/LICENSE', 'public/vendor/three.LICENSE')
console.log('Leitor QR local preparado: jsQR 1.4.0.')
