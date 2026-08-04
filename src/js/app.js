import { initializeLogin } from "./modules/login.js";
import { initializePasswordToggle } from "./modules/password.js";

function getElement(id) {
  return document.getElementById(id);
}

function initializeApp() {
  const currentYear = getElement("current-year");

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  initializePasswordToggle({
    button: getElement("toggle-password"),
    input: getElement("password"),
    icon: getElement("password-icon")
  });

  initializeLogin({
    form: getElement("login-form"),
    emailInput: getElement("email"),
    passwordInput: getElement("password"),
    rememberInput: getElement("remember"),
    emailError: getElement("email-error"),
    passwordError: getElement("password-error"),
    loginButton: getElement("login-button"),
    loginButtonText: getElement("login-button-text"),
    loginIcon: getElement("login-icon"),
    loginSpinner: getElement("login-spinner"),
    forgotPasswordLink: getElement("forgot-password"),
    microsoftLoginButton: getElement("microsoft-login"),
    formStatus: getElement("form-status")
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
