export function managerWhatsAppUrl(
  phone: string,
  request: {
    name: string;
    phone: string;
    message?: string;
    model?: string;
    path?: string;
  },
) {
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
