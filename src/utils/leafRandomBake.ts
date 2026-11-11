import * as THREE from 'three'

// The original per-instance hash is evaluated in a vertex shader once. Keep
// its exact GPU Float32 result, not a CPU Math.sin approximation (the fract
// amplifies tiny differences). Values upload as per-instance attributes.
export function bakeLeafRandomIds(renderer: THREE.WebGLRenderer, matrices: Float32Array) {
  if (!renderer.capabilities.isWebGL2) return null
  const gl = renderer.getContext() as WebGL2RenderingContext
  const previousTarget = renderer.getRenderTarget()
  const count = matrices.length / 16
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) positions.set(matrices.subarray(i * 16 + 12, i * 16 + 15), i * 3)
  const vertex = gl.createShader(gl.VERTEX_SHADER)!
  const fragment = gl.createShader(gl.FRAGMENT_SHADER)!
  const program = gl.createProgram()!
  const vao = gl.createVertexArray()!
  const input = gl.createBuffer()!
  const output = gl.createBuffer()!
  const feedback = gl.createTransformFeedback()!
  const compile = (shader: WebGLShader, source: string) => {
    gl.shaderSource(shader, source); gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  }
  let active = false
  try {
    if (!compile(vertex, `#version 300 es
      precision highp float;
      in vec3 translation; out float result;
      void main() { result = fract(sin(dot(translation, vec3(12.9898, 78.233, 45.164))) * 43758.5453); gl_Position = vec4(0.0); }`)
      || !compile(fragment, '#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.0);}') ) return null
    gl.attachShader(program, vertex); gl.attachShader(program, fragment)
    gl.transformFeedbackVaryings(program, ['result'], gl.INTERLEAVED_ATTRIBS)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
    gl.useProgram(program); gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, input); gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    const location = gl.getAttribLocation(program, 'translation')
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback)
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, output); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, count * 4, gl.STREAM_READ)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, output)
    gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); active = true
    gl.drawArrays(gl.POINTS, 0, count); gl.endTransformFeedback(); active = false
    gl.disable(gl.RASTERIZER_DISCARD)
    const values = new Float32Array(count)
    gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, values)
    if (gl.getError() !== gl.NO_ERROR || values.some(value => !Number.isFinite(value))) return null
    return values
  } finally {
    if (active) gl.endTransformFeedback()
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    gl.bindVertexArray(null)
    gl.deleteTransformFeedback(feedback); gl.deleteVertexArray(vao)
    gl.deleteBuffer(input); gl.deleteBuffer(output)
    gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment)
    renderer.resetState()
    renderer.setRenderTarget(previousTarget)
  }
}

export const leafTranslationKey = (array: ArrayLike<number>, offset: number) => `${array[offset + 12]},${array[offset + 13]},${array[offset + 14]}`

export function installLeafRandomIds(mesh: THREE.InstancedMesh, byTranslation: Map<string, number>) {
  const values = new Float32Array(mesh.count)
  for (let i = 0; i < mesh.count; i++) {
    const value = byTranslation.get(leafTranslationKey(mesh.instanceMatrix.array, i * 16))
    if (value === undefined) throw new Error('Missing exact leaf instance hash')
    values[i] = value
  }
  // Per-instance attributes cannot be shared among spatial chunks with
  // different orders. Clone only this small leaf geometry, never its shape.
  mesh.geometry = mesh.geometry.clone()
  mesh.geometry.setAttribute('aLeafRandom', new THREE.InstancedBufferAttribute(values, 1))
}
