export function showFieldError(input, errorElement, message) {
  const inputGroup = input.closest(".krontec-input");

  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
  inputGroup?.classList.toggle("is-invalid", Boolean(message));
}

export function clearFieldError(input, errorElement) {
  showFieldError(input, errorElement, "");
}

export function showStatus(statusElement, message, type = "info") {
  statusElement.textContent = message;
  statusElement.className = `alert alert-${type} mt-4 mb-0`;
}

export function clearStatus(statusElement) {
  statusElement.textContent = "";
  statusElement.className = "alert mt-4 mb-0 d-none";
}

export function setLoading(elements, isLoading) {
  const { button, buttonText, icon, spinner } = elements;

  button.disabled = isLoading;
  spinner.classList.toggle("d-none", !isLoading);
  icon.classList.toggle("d-none", isLoading);
  buttonText.textContent = isLoading ? "Validando acceso..." : "Iniciar sesión";
}
