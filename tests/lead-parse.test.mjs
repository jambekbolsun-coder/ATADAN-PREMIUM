import assert from "node:assert/strict";
import test from "node:test";
import { findPhones, matchModel, parseLeads, parseMeeting, phoneDigits } from "../app/admin/_lib/lead-parse.ts";

const models = [
  { slug: "cfh1804-m", model: "CFH1804-M" },
  { slug: "cf1004", model: "CF1004" },
  { slug: "cfh2004", model: "CFH2004" },
];
const now = new Date(Date.UTC(2026, 10, 12, 10, 0)); // 12 ноября 2026, Бишкек

const chatbot = `📌 Новая встреча — ATADAN
👤 Имя: Канай
📞 Телефон: +996709141371
🎂 Возраст:
🎯 Для чего: 150–400 гектарга, 180 ат күчүндөгү трактор керек
🚜 Интересует модель: CFH1804-M
🧩 Характер/заметки: чечкиндүү
💳 Оплата: рассрочка (взнос 10%)
📅 Встреча: 28инде в 15:00
📄 КП: https://atadan-`;

test("chatbot card becomes one lead with all fields", () => {
  const [lead, ...rest] = parseLeads(chatbot, models, { now });
  assert.equal(rest.length, 0);
  assert.equal(lead.name, "Канай");
  assert.equal(phoneDigits(lead.phone), "996709141371");
  assert.equal(lead.modelSlug, "cfh1804-m");
  assert.equal(lead.source, "chatbot");
  assert.equal(lead.meetingAt, "2026-11-28T15:00");
  assert.match(lead.comment, /Задача: 150–400 гектарга/);
  assert.match(lead.comment, /Оплата: рассрочка \(взнос 10%\)/);
  assert.match(lead.comment, /Заметки: чечкиндүү/);
  assert.match(lead.comment, /КП: https:\/\/atadan-/);
  assert.doesNotMatch(lead.comment, /Возраст/);
});

test("several chatbot cards in one paste split into several leads", () => {
  const two = `${chatbot}\n\n${chatbot.replace("Канай", "Бакыт").replace("+996709141371", "0555 12 34 56")}`;
  const leads = parseLeads(two, models, { now });
  assert.equal(leads.length, 2);
  assert.equal(leads[1].name, "Бакыт");
  assert.equal(phoneDigits(leads[1].phone), "996555123456");
});

test("free WhatsApp messages separated by blank lines", () => {
  const text = "Азамат\n+996 700 11 22 33\nинтересует CF1004, лизинг\n\nНурбек 0772 445566 нужен трактор 200 л.с. CFH2004";
  const leads = parseLeads(text, models, { now, source: "whatsapp" });
  assert.equal(leads.length, 2);
  assert.equal(leads[0].name, "Азамат");
  assert.equal(leads[0].modelSlug, "cf1004");
  assert.equal(leads[0].source, "whatsapp");
  assert.equal(phoneDigits(leads[1].phone), "996772445566");
  assert.equal(leads[1].name, "Нурбек");
  assert.equal(leads[1].modelSlug, "cfh2004");
});

test("meeting phrases", () => {
  assert.equal(parseMeeting("28 ноября в 15:00", now), "2026-11-28T15:00");
  assert.equal(parseMeeting("завтра в 10:30", now), "2026-11-13T10:30");
  assert.equal(parseMeeting("5 числа", now), "2026-12-05T10:00");
  assert.equal(parseMeeting("05.01 в 9", now), "2027-01-05T09:00");
  assert.equal(parseMeeting("эртең саат 11", now), "2026-11-13T11:00");
  assert.equal(parseMeeting("позже созвонимся", now), "");
});

test("helpers", () => {
  assert.deepEqual(findPhones("тел 0700 123 456, еще +996 555 000 111"), ["0700 123 456", "+996 555 000 111"]);
  assert.equal(matchModel("cfh 1804 m", models)?.slug, "cfh1804-m");
  assert.equal(matchModel("нужен 1804-M", models)?.slug, "cfh1804-m");
  assert.equal(matchModel("просто трактор", models), null);
});
