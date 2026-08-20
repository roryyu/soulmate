export async function loadMJS(path) {
  const module = await import(
    /* webpackIgnore: true */ 
    path + "?module"
  );
  return module;
}