export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">利用規約</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">1. サービスの提供</h2>
          <p className="text-gray-600">
            本サービス「不動産工房」は、PDFファイルの編集機能を無料で提供するWebアプリケーションです。
            本サービスは現状有姿で提供され、その正確性・完全性・信頼性について保証するものではありません。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">2. ファイルの取り扱い</h2>
          <p className="text-gray-600">
            本サービスで編集されるPDFファイルは、すべてお客様のブラウザ内で処理されます。
            サーバーへのファイル送信は一切行われません。
            編集されたファイルの著作権はお客様に帰属します。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">3. 免責事項</h2>
          <p className="text-gray-600">
            本サービスの利用により生じた損害について、運営者は一切の責任を負いません。
            重要な文書の編集にあたっては、必ず原本のバックアップを保管してください。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">4. 禁止事項</h2>
          <p className="text-gray-600">
            本サービスを利用して、違法行為、他者の権利を侵害する行為、またはサービスの運営を妨害する行為を行うことを禁止します。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6 mb-3">5. 規約の変更</h2>
          <p className="text-gray-600">
            本規約は予告なく変更される場合があります。変更後も本サービスの利用を継続した場合、変更後の規約に同意したものとみなします。
          </p>
        </section>
      </div>
    </div>
  )
}
