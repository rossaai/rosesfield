import type { MeshImage, MeshPart, MeshScene } from "@/studio/three-d/glb"
import type { Camera } from "@/studio/three-d/orbit"

type Draw = {
  vertices: WebGLVertexArrayObject
  buffers: WebGLBuffer[]
  count: number
  color: readonly [number, number, number, number]
  texture: WebGLTexture | null
}

type Slots = {
  camera: WebGLUniformLocation | null
  eye: WebGLUniformLocation | null
  baseColor: WebGLUniformLocation | null
  hasTexture: WebGLUniformLocation | null
  baseTexture: WebGLUniformLocation | null
}

const vertexSource = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 uv;
layout(location = 3) in vec4 color;
uniform mat4 camera;
out vec3 vPosition;
out vec3 vNormal;
out vec2 vUv;
out vec4 vColor;
void main() {
  vPosition = position;
  vNormal = normal;
  vUv = uv;
  vColor = color;
  gl_Position = camera * vec4(position, 1.0);
}`

const fragmentSource = `#version 300 es
precision highp float;
in vec3 vPosition;
in vec3 vNormal;
in vec2 vUv;
in vec4 vColor;
uniform vec3 eye;
uniform vec4 baseColor;
uniform bool hasTexture;
uniform sampler2D baseTexture;
out vec4 outColor;
void main() {
  vec4 albedo = baseColor * vColor;
  if (hasTexture) {
    albedo *= texture(baseTexture, vUv);
  }
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) {
    n = -n;
  }
  float head = max(dot(n, normalize(eye - vPosition)), 0.0);
  float top = max(dot(n, normalize(vec3(0.4, 0.9, 0.3))), 0.0);
  vec3 lit = albedo.rgb * (0.35 + 0.45 * head + 0.3 * top);
  outColor = vec4(min(lit, vec3(1.0)), 1.0);
}`

const attribute = { position: 0, normal: 1, uv: 2, color: 3 } as const

function shaderOf(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (shader === null) {
    return null
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  const isCompiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS) === true
  return isCompiled ? shader : null
}

function programOf(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = shaderOf(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = shaderOf(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (vertex === null || fragment === null || program === null) {
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  const isLinked = gl.getProgramParameter(program, gl.LINK_STATUS) === true
  return isLinked ? program : null
}

export class MeshRenderer {
  readonly #gl: WebGL2RenderingContext
  readonly #program: WebGLProgram
  readonly #slots: Slots
  #draws: Draw[] = []
  #isDisposed = false

  constructor(options: { gl: WebGL2RenderingContext; program: WebGLProgram }) {
    const { gl, program } = options
    this.#gl = gl
    this.#program = program
    this.#slots = {
      camera: gl.getUniformLocation(program, "camera"),
      eye: gl.getUniformLocation(program, "eye"),
      baseColor: gl.getUniformLocation(program, "baseColor"),
      hasTexture: gl.getUniformLocation(program, "hasTexture"),
      baseTexture: gl.getUniformLocation(program, "baseTexture"),
    }
  }

  static of(canvas: HTMLCanvasElement): MeshRenderer | null {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true })
    if (gl === null) {
      return null
    }
    const program = programOf(gl)
    return program === null ? null : new MeshRenderer({ gl, program })
  }

  load(scene: MeshScene, onTexture: () => void): Promise<void> {
    this.#clear()
    const textures: Promise<void>[] = []
    this.#draws = scene.parts.flatMap((part) => {
      const draw = this.#upload(part)
      if (draw !== null && part.texture !== null) {
        textures.push(this.#loadTexture(draw, part.texture, onTexture))
      }
      return draw === null ? [] : [draw]
    })
    return Promise.all(textures).then(() => undefined)
  }

  draw(camera: Camera, width: number, height: number): void {
    const gl = this.#gl
    if (this.#isDisposed) {
      return
    }
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    // biome-ignore lint/correctness/useHookAtTopLevel: useProgram is a WebGL call, not a React hook
    gl.useProgram(this.#program)
    const matrix = new Float32Array(camera.matrix)
    gl.uniformMatrix4fv(this.#slots.camera, false, matrix)
    gl.uniform3f(this.#slots.eye, camera.eye[0], camera.eye[1], camera.eye[2])
    gl.uniform1i(this.#slots.baseTexture, 0)
    for (const draw of this.#draws) {
      gl.uniform4f(this.#slots.baseColor, ...draw.color)
      gl.uniform1i(this.#slots.hasTexture, draw.texture === null ? 0 : 1)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, draw.texture)
      gl.bindVertexArray(draw.vertices)
      gl.drawElements(gl.TRIANGLES, draw.count, gl.UNSIGNED_INT, 0)
    }
    gl.bindVertexArray(null)
  }

  dispose(): void {
    this.#clear()
    this.#gl.deleteProgram(this.#program)
    this.#isDisposed = true
  }

  release(): void {
    this.dispose()
    this.#gl.getExtension("WEBGL_lose_context")?.loseContext()
  }

  #clear(): void {
    const gl = this.#gl
    for (const draw of this.#draws) {
      gl.deleteVertexArray(draw.vertices)
      for (const buffer of draw.buffers) {
        gl.deleteBuffer(buffer)
      }
      gl.deleteTexture(draw.texture)
    }
    this.#draws = []
  }

  #attribute(
    location: number,
    data: Float32Array | null,
    size: number,
    fallback: readonly [number, number, number, number]
  ): WebGLBuffer | null {
    const gl = this.#gl
    if (data === null) {
      gl.disableVertexAttribArray(location)
      gl.vertexAttrib4f(location, ...fallback)
      return null
    }
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
    return buffer
  }

  #upload(part: MeshPart): Draw | null {
    const gl = this.#gl
    const vertices = gl.createVertexArray()
    if (vertices === null) {
      return null
    }
    gl.bindVertexArray(vertices)
    const buffers = [
      this.#attribute(attribute.position, part.positions, 3, [0, 0, 0, 1]),
      this.#attribute(attribute.normal, part.normals, 3, [0, 0, 1, 0]),
      this.#attribute(attribute.uv, part.uvs, 2, [0, 0, 0, 0]),
      this.#attribute(attribute.color, part.colors, 4, [1, 1, 1, 1]),
    ].filter((buffer): buffer is WebGLBuffer => buffer !== null)
    const indices = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, part.indices, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return {
      vertices,
      buffers: [...buffers, indices],
      count: part.indices.length,
      color: part.color,
      texture: null,
    }
  }

  async #loadTexture(
    draw: Draw,
    image: MeshImage,
    onTexture: () => void
  ): Promise<void> {
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(
        new Blob([image.bytes.slice()], { type: image.mime })
      )
    } catch {
      return
    }
    const gl = this.#gl
    if (this.#isDisposed || !this.#draws.includes(draw)) {
      bitmap.close()
      return
    }
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
    gl.generateMipmap(gl.TEXTURE_2D)
    const smooth = gl.LINEAR_MIPMAP_LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, smooth)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    bitmap.close()
    draw.texture = texture
    onTexture()
  }
}
