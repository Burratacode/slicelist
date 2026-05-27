import sharp from 'sharp'

const sizes = [180, 192, 512]

for (const size of sizes) {
  const radius = Math.round(size * 0.22)
  const fontSize = Math.round(size * 0.58)
  const emojiY = Math.round(size * 0.62)

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#E83A00" rx="${radius}" ry="${radius}"/>
    <text
      x="50%"
      y="${emojiY}"
      font-size="${fontSize}"
      text-anchor="middle"
      font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
    >🍕</text>
  </svg>`

  const outputPath = size === 180
    ? `public/icons/apple-touch-icon.png`
    : `public/icons/icon-${size}.png`

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath)

  console.log(`✓ Generated ${outputPath} (${size}x${size})`)
}
