import { APP_CONFIG } from "../config/app.config.js";
import {
  validateCorporateEmail,
  validatePassword
} from "../shared/validators.js";
import {
  clearFieldError,
  clearStatus,
  setLoading,
  showFieldError,
  showStatus
} from "../shared/ui.js";

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function initializeLogin(elements) {
  const {
    form,
    emailInput,
    passwordInput,
    rememberInput,
    emailError,
    passwordError,
    loginButton,
    loginButtonText,
    loginIcon,
    loginSpinner,
    forgotPasswordLink,
    microsoftLoginButton,
    formStatus
  } = elements;

  if (!form) {
    return;
  }

  const rememberedEmail = localStorage.getItem(APP_CONFIG.rememberedEmailKey);

  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberInput.checked = true;
  }

  const validateForm = () => {
    const emailMessage = validateCorporateEmail(
      emailInput.value,
      APP_CONFIG.corporateDomain
    );
    const passwordMessage = validatePassword(
      passwordInput.value,
      APP_CONFIG.minimumPasswordLength
    );

    showFieldError(emailInput, emailError, emailMessage);
    showFieldError(passwordInput, passwordError, passwordMessage);

    return !emailMessage && !passwordMessage;
  };

  emailInput.addEventListener("input", () => {
    clearFieldError(emailInput, emailError);
    clearStatus(formStatus);
  });

  passwordInput.addEventListener("input", () => {
    clearFieldError(passwordInput, passwordError);
    clearStatus(formStatus);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus(formStatus);

    if (!validateForm()) {
      return;
    }

    setLoading(
      {
        button: loginButton,
        buttonText: loginButtonText,
        icon: loginIcon,
        spinner: loginSpinner
      },
      true
    );

    try {
      await wait(APP_CONFIG.simulatedRequestDelay);

      const normalizedEmail = emailInput.value.trim().toLowerCase();

      if (rememberInput.checked) {
        localStorage.setItem(APP_CONFIG.rememberedEmailKey, normalizedEmail);
      } else {
        localStorage.removeItem(APP_CONFIG.rememberedEmailKey);
      }

      localStorage.setItem(
        "krontec.demoSession",
        JSON.stringify({
          email: normalizedEmail,
          startedAt: new Date().toISOString()
        })
      );

      showStatus(
        formStatus,
        "Inicio de sesión correcto. Redirigiendo al registro de horas…",
        "success"
      );

      await wait(450);
      window.location.href = "./pages/registro-horas.html";
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      showStatus(
        formStatus,
        "No fue posible iniciar sesión. Inténtalo nuevamente.",
        "danger"
      );
    } finally {
      setLoading(
        {
          button: loginButton,
          buttonText: loginButtonText,
          icon: loginIcon,
          spinner: loginSpinner
        },
        false
      );
    }
  });

  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    clearStatus(formStatus);

    const emailMessage = validateCorporateEmail(
      emailInput.value,
      APP_CONFIG.corporateDomain
    );

    showFieldError(emailInput, emailError, emailMessage);

    if (emailMessage) {
      emailInput.focus();
      return;
    }

    showStatus(
      formStatus,
      "La recuperación de contraseña se conectará al correo corporativo cuando implementemos la autenticación.",
      "info"
    );
  });

  microsoftLoginButton.addEventListener("click", () => {
    clearStatus(formStatus);
    showStatus(
      formStatus,
      "El acceso con Microsoft quedará conectado posteriormente con Microsoft Entra ID.",
      "info"
    );
  });
}
