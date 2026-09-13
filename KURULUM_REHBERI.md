# 🚀 Cyber Turquoise GitHub Profil Kurulum Rehberi

Tebrikler! Sıradan profillerin çok ötesinde, fütüristik **Mavi-Turkuaz (Neon Cyan / Electric Blue)** temalı GitHub profil şablonunuz hazırlandı.

Bu rehberi takip ederek 3-5 dakika içinde profilinizi GitHub'da canlıya alabilirsiniz.

---

## 📌 Adım 1: Özel GitHub Profil Deposunu Açın

1. [GitHub](https://github.com) hesabınıza giriş yapın.
2. Sağ üstteki **`+`** (artı) simgesine tıklayıp **"New repository"** deyin.
3. **Repository name** kısmına **birebir GitHub kullanıcı adınızı** yazın (Örn: `yunus`).
   - GitHub size şu özel mesajı gösterecektir: *"You found a secret! [kullanıcıadınız]/[kullanıcıadınız] is a ✨special ✨ repository that you can use to add a README.md to your GitHub profile."*
4. Deponun **Public** (Herkese Açık) olduğundan emin olun.
5. **"Add a README file"** seçeneğini işaretleyin ve **"Create repository"** butonuna tıklayın.

---

## ⚡ Adım 2: Kendi Bilgilerinizi Güncelleyin (Bul ve Değiştir)

Masaüstündeki `README.md` dosyasını herhangi bir metin editöründe (Notepad, VS Code vb.) açın:
- **`Ctrl + H`** (Bul ve Değiştir) tuşlarına basın.
- **Aranan**: `YOUR_GITHUB_USERNAME`
- **Yeni Değer**: Kendi GitHub kullanıcı adınız
- **Tümünü Değiştir** butonuna tıklayın.

Ayrıca:
- `YOUR_LINKEDIN`, `YOUR_TWITTER` ve `your_email@example.com` gibi sosyal medya bağlantılarını kendi linklerinizle güncelleyin.
- Kod bloğundaki (`const developer = {...}`) bilgileri kendinize göre düzenleyin.

---

## 📁 Adım 3: Dosyaları GitHub'a Yükleyin

### Yöntem A (GitHub Web Arayüzünden - En Kolay):
1. Açtığınız deponun sayfasına gidin (`github.com/kullaniciadiniz/kullaniciadiniz`).
2. Masaüstündeki `github-profile-aesthetic` klasörünün içindeki:
   - `README.md` dosyasını
   - `assets` klasörünü (içindeki `cyber_banner.svg` ile birlikte)
   sayfaya sürükleyip bırakın (veya **Add file -> Upload files** deyin).
3. **Commit changes** butonuna basın.

### Yöntem B (Git Terminali İle):
```bash
cd C:\Users\Yunus\Desktop\github-profile-aesthetic
git init
git add .
git commit -m "feat: futuristic cyber turquoise profile"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/KULLANICI_ADINIZ.git
git push -u origin main --force
```

---

## 🐍 Adım 4: Yılan (Snake) Katkı Grafiğini Aktif Etme

Katkı grafiğinizi bir yılanın yediği karanlık turkuaz animasyonun her gün otomatik üretilmesi için:

1. Deponuzda **Settings** (Ayarlar) sekmesine gidin.
2. Sol menüden **Actions** -> **General** yolunu izleyin.
3. Sayfanın en altına inin ve **"Workflow permissions"** bölümünü bulun.
4. **"Read and write permissions"** seçeneğini işaretleyin ve **Save** (Kaydet) deyin.
5. Deponuzdaki **Actions** sekmesine gidin, sol tarafta **"Generate Contribution Snake Animation"** iş akışını göreceksiniz.
6. Üzerine tıklayıp **Run workflow** diyerek ilk üretimi başlatın! Birkaç saniye içinde `output` dalı açılacak ve yılan profilinizde belirecektir.

---

## 🎨 Tasarım İpuçları & Kişiselleştirme

- **Teknoloji İkonlarını Değiştirmek**:
  `https://skillicons.dev/icons?i=...` linkindeki virgülle ayrılmış isimleri dilediğiniz gibi ekleyip çıkarabilirsiniz (örneğin `flutter`, `swift`, `rust`, `c`, `cpp` vb.).
- **Banner Üzerindeki İsim**:
  `assets/cyber_banner.svg` dosyasını açıp `<h1 class="main-title">YUNUS</h1>` kısmından ismi veya unvanı dilediğiniz gibi güncelleyebilirsiniz.

---

*Tadını çıkarın! Profiliniz artık GitHub'ın en dikkat çekici vitrinlerinden biri.* 🚀
