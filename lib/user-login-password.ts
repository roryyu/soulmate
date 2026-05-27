/**
 * 判断用户是否已在库中保存过可用的 bcrypt 登录密码。
 * 手机号注册等场景会将 password 存为空字符串，视为「未设置密码」。
 */
export function userHasLoginPasswordSet(storedPassword: string): boolean {
  if (!storedPassword || storedPassword.length < 20) return false
  return /^\$2[aby]\$/.test(storedPassword)
}
