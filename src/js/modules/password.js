export function initializePasswordToggle({ button, input, icon }) {
  if (!button || !input || !icon) {
    return;
  }

  button.addEventListener("click", () => {
    const willShowPassword = input.type === "password";

    input.type = willShowPassword ? "text" : "password";
    icon.className = willShowPassword ? "bi bi-eye-slash" : "bi bi-eye";
    button.setAttribute(
      "aria-label",
      willShowPassword ? "Ocultar contraseña" : "Mostrar contraseña"
    );
    button.setAttribute("aria-pressed", String(willShowPassword));
    input.focus();
  });
}
