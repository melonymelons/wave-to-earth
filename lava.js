const forms = [
  { x: .19, y: .23, r: .13, rgb: [245, 178, 59], phase: .5 },
  { x: .77, y: .24, r: .15, rgb: [236, 129, 39], phase: 2.2 },
  { x: .49, y: .53, r: .13, rgb: [248, 188, 65], phase: 4.5 },
  { x: .83, y: .77, r: .09, rgb: [224, 114, 35], phase: 1.4 },
  { x: .17, y: .74, r: .105, rgb: [243, 159, 43], phase: 3.6 },
  { x: .47, y: .88, r: .06, rgb: [249, 190, 82], phase: 5.3 },
];

export function lavaMasses(width, height, seconds) {
  const scale = Math.min(width, height);
  const masses = [];
  forms.forEach((form, index) => {
    const time = seconds * (.07 + index * .007);
    const radius = scale * form.r;
    const x = width * (form.x + Math.sin(time * .7 + form.phase) * .07);
    const y = height * (form.y + Math.cos(time + form.phase) * .13);
    masses.push({ x, y, r2: radius * radius, stretch: 1 + Math.sin(time + form.phase) * .15, rgb: form.rgb });
    // A secondary mass pulls a neck out of each form and gently rejoins it.
    const reach = radius * (.48 + .38 * Math.sin(time * .8 + form.phase));
    masses.push({
      x: x + Math.sin(time * .5 + form.phase) * reach,
      y: y - reach * 1.1,
      r2: radius * radius * .24,
      stretch: 1.15, rgb: form.rgb,
    });
  });
  return masses;
}

// An implicit liquid surface, rather than separately outlined animated shapes.
// Surface normals give it volume; color remains warm without white highlights.
export function shadeLava(data, width, height, masses) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let field = 0;
      let gx = 0;
      let gy = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (const mass of masses) {
        const dx = x - mass.x;
        const dy = y - mass.y;
        const distance = dx * dx + dy * dy * mass.stretch + mass.r2 * .06;
        const influence = mass.r2 / distance;
        field += influence;
        const derivative = 2 * influence / distance;
        gx += derivative * dx;
        gy += derivative * dy * mass.stretch;
        red += influence * mass.rgb[0];
        green += influence * mass.rgb[1];
        blue += influence * mass.rgb[2];
      }
      const offset = (y * width + x) * 4;
      if (field < .68) { data[offset + 3] = 0; continue; }
      const edge = Math.max(0, Math.min(1, (field - 1.04) / .13));
      const opacity = edge * edge * (3 - 2 * edge);
      const depth = Math.sqrt(Math.max(0, 1 - 1.04 / Math.max(field, 1.04)));
      const gradientLength = Math.hypot(gx, gy) || 1;
      const lateral = Math.sqrt(1 - depth * depth);
      const nx = gx / gradientLength * lateral;
      const ny = gy / gradientLength * lateral;
      const lighting = Math.max(0, nx * -.24 + ny * .42 + depth * .87);
      const illumination = .38 + lighting * .52 + depth * .2;
      const rim = Math.pow(1 - depth, 3) * lighting * .09;
      data[offset] = red / field * illumination + rim * 190;
      data[offset + 1] = green / field * illumination + rim * 85;
      data[offset + 2] = blue / field * illumination;
      // A very faint halo is restricted to the immediate vicinity of the wax.
      const halo = Math.pow(Math.max(0, (field - .68) / .49), 2) * .035;
      data[offset + 3] = (opacity + (1 - opacity) * halo) * 255;
    }
  }
}

const surfaces = new WeakMap();

export function paintLava(ctx, width, height, seconds) {
  const doc = ctx.canvas?.ownerDocument;
  if (!doc?.createElement) return;
  let surface = surfaces.get(ctx);
  const pixelWidth = Math.round(Math.sqrt(90000 * width / height));
  const pixelHeight = Math.round(90000 / pixelWidth);
  if (!surface || surface.width !== pixelWidth || surface.height !== pixelHeight) {
    const canvas = doc.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext('2d');
    surface = { canvas, context, width: pixelWidth, height: pixelHeight, image: context.createImageData(pixelWidth, pixelHeight), time: -Infinity };
    surfaces.set(ctx, surface);
  }
  // The liquid moves slowly enough to render at 24 fps, leaving navigation fluid.
  if (Math.abs(seconds - surface.time) >= 1 / 24) {
    const masses = lavaMasses(pixelWidth, pixelHeight, seconds);
    shadeLava(surface.image.data, pixelWidth, pixelHeight, masses);
    surface.context.putImageData(surface.image, 0, 0);
    surface.time = seconds;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(surface.canvas, 0, 0, width, height);
}
