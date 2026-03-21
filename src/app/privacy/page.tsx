export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">1. データの取り扱いについて</h2>
          <p className="text-gray-600">
            当サービス「不動産PDF工房」では、お客様がアップロードしたPDFファイルは一切サーバーに送信されません。
            すべてのPDF編集処理は、お客様のブラウザ内（クライアントサイド）で完結します。
            そのため、ファイルの内容が外部に漏洩するリスクはありません。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">2. Cookie・アクセス解析について</h2>
          <p className="text-gray-600">
            当サービスでは、サービス改善のためにGoogle Analyticsを利用してアクセス情報を収集する場合があります。
            また、広告配信のためにGoogle AdSenseを利用する場合があり、これらのサービスはCookieを使用する場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">3. 個人情報について</h2>
          <p className="text-gray-600">
            当サービスではアカウント登録を必要としないため、個人情報の収集は行いません。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">4. お問い合わせ</h2>
          <p className="text-gray-600">
            プライバシーポリシーに関するお問い合わせは、サイト内のお問い合わせフォームよりご連絡ください。
          </p>
        </section>
      </div>
    </div>
  )
}
