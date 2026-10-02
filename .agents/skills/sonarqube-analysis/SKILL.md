---
name: sonarqube-analysis
description: SonarQube statik kod analizi, Clean as You Code (CaYC) kalite kontrolleri ve otomatik hata düzeltme adımları. Kod yazıldığında veya güncellendiğinde Sonar way kalite kapısına (sıfır code smell, sıfır zafiyet, sıfır security hotspot, düşük bilişsel karmaşıklık) tam uyum sağlamak için her defasında çalıştırılır.
---

# SonarQube Static Code Analysis & Remediation Workflow

Bu beceri (skill), projede üretilen veya düzenlenen tüm kodların (`apps/backend`, `apps/admin-interface`, `apps/user-interface`) SonarQube ve Clean as You Code standartlarına uygunluğunu doğrulamak ve sıfır hata/uyarı garantisi vermek için kullanılır.

---

## 1. Ne Zaman ve Nasıl Tetiklenir?

- **Zorunlu Kural:** Her kod yazma, düzenleme veya refactoring adımının ardından ilgili kod parçası SonarQube analizinden geçirilmelidir.
- Kod yazıldıktan sonra analiz adımı atlanamaz; tespit edilen uyarılar derhal düzeltilmelidir.

---

## 2. SonarQube MCP Analiz Prosedürü

1. **Hedef Dosya İçeriğini Hazırla:**
   Düzenlenen veya yeni oluşturulan dosyanın tam içeriğini al.

2. **`analyze_code_snippet` Aracını Çağır:**
   `call_mcp_tool` kullanarak `sonarqube` sunucusu üzerinden analiz yap:
   ```json
   {
     "ServerName": "sonarqube",
     "ToolName": "analyze_code_snippet",
     "Arguments": {
       "fileContent": "<dosya_tam_icerigi>",
       "language": "tsx", // veya "ts", "js", "jsx", "html", "css"
       "scope": "MAIN"
     }
   }
   ```

3. **Sonuçları Değerlendir:**
   - `issueCount === 0`: Kod temizdir, işlem tamamlanabilir.
   - `issueCount > 0`: Dönen her bir sorunu (`ruleKey`, `primaryMessage`, `textRange`, `severity`) incele ve aşağıdaki düzeltme kılavuzuna göre anında gider.

4. **Yeniden Analiz ve Doğrulama (Loop-Back):**
   Düzeltme yapıldıktan sonra `analyze_code_snippet` aracını tekrar çağırarak `issueCount: 0` olduğunu teyit et.

---

## 3. Yaygın SonarQube Kuralları ve Çözüm Standartları

| Kural Anahtarı | Açıklama | Çözüm Yolu |
| :--- | :--- | :--- |
| `typescript:S3776` | Cognitive Complexity yüksek (> 15) | Fonksiyonu daha küçük, tek sorumluluklu yardımcı fonksiyonlara böl (Extract Function). |
| `typescript:S1854` | Useless assignment to variable | Kullanılmayan veya üzerine tekrar yazılan geçici değişken atamalarını temizle. |
| `typescript:S1481` | Unused local variables | Kullanılmayan import ve değişkenleri kaldır veya `_` ile önekle. |
| `typescript:S1862` | Duplicate branch implementation / condition | Tekrarlayan koşul dallarını birleştir veya mantıksal hatayı düzelt. |
| `typescript:S6848` / `S6847` | Erişilebilirlik (A11y) - onClick on non-interactive element | `role="button"`, `tabIndex={0}` ve klavye dinleyicisi (`onKeyDown`) ekle ya da doğrudan `<button type="button">` kullan. |
| `typescript:S5147` | Missing `rel="noopener noreferrer"` | Harici linklerde (`target="_blank"`) güvenlik için `rel="noopener noreferrer"` ekle. |
| `typescript:S2589` | Boolean expression is always true/false | Fazlalık veya her zaman aynı değere dönen mantıksal kontrolleri sadeleştir. |
| `typescript:S6544` | Unhandled Promise rejection | Asenkron çağrılarda `.catch()` veya `try/catch` blokları ile hata yakalamayı zorunlu kıl. |
| `react:S6443` | Using array index as key in React lists | Kararlı ve benzersiz kimlik (`item.id`, `item._id` vb.) kullan; index kullanımından kaçın. |

---

## 4. IDE Problems & SonarLint Uyumluluğu

- IDE üzerinde çalışan SonarLint eklentisinin ürettiği uyarılar doğrudan bu kurallarla örtüşür.
- IDE bildirimleri veya SonarQube MCP sonuçları sıfırlanmadan geliştirme tamamlanmış sayılamaz.
