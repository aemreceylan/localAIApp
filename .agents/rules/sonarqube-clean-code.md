# SonarQube Clean Code & Security Gate Compliance Rule

> **KAPSAM:** Tüm AI Kodlama Ajanları & Asistanlar  
> **ZORUNLULUK:** KESİNTİSİZ VE İSTİSNASIZ UYGULANIR  
> **AMAÇ:** Projede yazılan veya düzenlenen her kod satırının SonarQube kalite kapısından (Sonar way) geçmesini, sıfır code smell ve sıfır güvenlik uyarısı içermesini garanti altına almak.

---

## 1. Kod Yazımında SonarQube Zorunluluğu

1. **Her Kod Değişikliğinde Analiz:**  
   Yeni bir dosya oluşturulduğunda veya mevcut bir dosya düzenlendiğinde; geliştirme SonarQube analizinden (`analyze_code_snippet` MCP aracı veya SonarLint) geçirilmeden tamamlanmış sayılamaz.
2. **Sıfır Tolerans (Zero Code Smells & Zero Hotspots):**  
   - Bilişsel karmaşıklık (Cognitive Complexity) sınırları aşılmamalıdır (fonksiyonlar küçük, modüler ve tek odaklı olmalıdır).
   - Kullanılmayan importlar, ölü değişkenler, gereksiz tip dönüşümleri kesinlikle bırakılamaz.
   - Erişilebilirlik (A11y - aria etiketleri, klavye etkileşimi, buton tipleri) standartlarına harfiyen uyulmalıdır.
3. **Analiz ve İyileştirme Döngüsü:**  
   Kod yazıldıktan sonra SonarQube MCP aracı ile kontrol edilir; bulunan sorunlar anında düzeltilerek yeniden doğrulanır.
