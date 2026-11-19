export function managerWhatsAppUrl(
  phone: string,
  request: {
    name: string;
    phone: string;
    message?: string;
    model?: string;
    path?: string;
    /** Своя первая строка вместо «Интересует Changfa …»; тогда детали идут до телефона. */
    headline?: string;
  },
) {
  if (request.headline) {
    const text = [`Здравствуйте! Меня зовут ${request.name}.`, request.headline, request.message?.trim(), `Мой телефон: ${request.phone}`, request.path ? `Страница: ${request.path}` : ""].filter(Boolean).join("\n");
    return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  }
  const text = [
    `Здравствуйте! Меня зовут ${request.name}.`,
    request.model
      ? `Интересует Changfa ${request.model}.`
      : "Оставил(а) заявку на сайте ATADAN.",
    `Мой телефон: ${request.phone}`,
    request.message?.trim(),
    request.path ? `Страница: ${request.path}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
