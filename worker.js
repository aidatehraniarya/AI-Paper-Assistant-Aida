const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=UTF-8"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "فقط درخواست POST پذیرفته می‌شود." }),
        { status: 405, headers: CORS_HEADERS }
      );
    }

    try {
      if (!env.GROQ_API_KEY) {
        throw new Error("کلید اتصال هوش مصنوعی تنظیم نشده است.");
      }

      const body = await request.json();
      const text = body.text;
      const filename = body.filename || "بدون نام";

      if (!text || typeof text !== "string") {
        throw new Error("متن مقاله دریافت نشد.");
      }

      if (text.trim().length < 300) {
        throw new Error("متن مقاله برای تحلیل کافی نیست.");
      }

      const articleText = text.slice(0, 70000);

      const prompt = `
تو دستیار پژوهشی دانشگاهی هستی.
مقاله را فقط بر اساس متن ارائه‌شده تحلیل کن.
هیچ اطلاعاتی را حدس نزن یا از خودت اضافه نکن.
اگر اطلاعاتی در مقاله وجود ندارد، بنویس: «در مقاله مشخص نشده است».
پاسخ‌ها فارسی، دقیق، ساده و مناسب ارائه دانشجویی باشند.
در صورت امکان شماره صفحه شواهد را ذکر کن.

این موارد را به ترتیب بررسی کن:

۱. عنوان مقاله
۲. نام نویسنده یا نویسندگان
۳. سال انتشار
۴. معرفی و خلاصه کوتاه مقاله
۵. نوع پژوهش: کمی، کیفی یا ترکیبی؛ همراه با دلیل
۶. منطق پژوهش: استقرایی یا قیاسی؛ همراه با دلیل
۷. جامعه آماری
۸. نمونه پژوهش
۹. روش نمونه‌گیری
۱۰. روش گردآوری داده‌ها
۱۱. روش تجزیه و تحلیل داده‌ها
۱۲. فرضیه‌ها یا سؤال‌های پژوهش
۱۳. مهم‌ترین یافته‌های پژوهش
۱۴. نتیجه‌گیری نهایی و شواهد آن

متن مقاله:
${articleText}
`;

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: "تو یک تحلیلگر دقیق مقالات علمی هستی."
              },
              {
                role: "user",
                content: `نام فایل: ${filename}\n\n${prompt}`
              }
            ],
            max_completion_tokens: 5000
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "ارتباط با هوش مصنوعی ناموفق بود."
        );
      }

      const analysis = result.choices?.[0]?.message?.content;

      if (!analysis) {
        throw new Error("پاسخ معتبری از هوش مصنوعی دریافت نشد.");
      }

      return new Response(
        JSON.stringify({ analysis }),
        { status: 200, headers: CORS_HEADERS }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }
};