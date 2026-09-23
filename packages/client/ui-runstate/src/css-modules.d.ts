/** Ambient declarations so `*.module.css` imports type-check. */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
