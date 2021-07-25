export const makeShader = (gl: WebGLRenderingContext, type: GLenum, program: string) => {
	const shader = gl.createShader(type);
	if (!shader)
		throw new Error('Failed to create the shader!');
	
	gl.shaderSource(shader, program);
	gl.compileShader(shader);
	
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
		throw new Error('Failed to compile the shader!');
	
	return shader;
}
