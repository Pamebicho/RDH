export function validateCorporateEmail(email, corporateDomain) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalizedEmail) {
    return "Debes ingresar tu correo corporativo.";
  }

  if (!emailPattern.test(normalizedEmail)) {
    return "El correo ingresado no tiene un formato válido.";
  }

  if (!normalizedEmail.endsWith(`@${corporateDomain}`)) {
    return `Debes utilizar un correo @${corporateDomain}.`;
  }

  return "";
}

export function validatePassword(password, minimumLength) {
  if (!password) {
    return "Debes ingresar tu contraseña.";
  }

  if (password.length < minimumLength) {
    return `La contraseña debe tener al menos ${minimumLength} caracteres.`;
  }

  return "";
}
