/**
 * Module nén và chuyển đổi hình ảnh thông minh sang chuẩn WebP
 * Tối ưu dung lượng từ 5-10MB xuống 200-500KB mà vẫn duy trì chất lượng sắc nét.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
}

/**
 * Chuyển đổi và nén ảnh sang chuẩn WebP sử dụng HTML5 Canvas
 * @param file Tệp hình ảnh đầu vào (JPEG, PNG, HEIC, WebP, v.v.)
 * @param options Tùy chọn chiều rộng, chiều cao tối đa và chất lượng nén (mặc định quality = 0.82)
 */
export async function compressImageToWebP(
  file: File,
  options?: CompressOptions
): Promise<CompressResult> {
  const originalSize = file.size;

  // Nếu không phải là tệp ảnh hợp lệ, giữ nguyên tệp ban đầu
  if (!file.type || !file.type.startsWith('image/')) {
    return { file, originalSize, compressedSize: originalSize };
  }

  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1920;
  const quality = options?.quality ?? 0.82;

  return new Promise((resolve, reject) => {
    // Kiểm tra môi trường trình duyệt hỗ trợ
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve({ file, originalSize, compressedSize: originalSize });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Giữ tỉ lệ khung hình (aspect ratio) khi thu nhỏ
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, originalSize, compressedSize: originalSize });
          return;
        }

        // Kích hoạt thuật toán nội suy chất lượng cao
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ra định dạng image/webp
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, originalSize, compressedSize: originalSize });
              return;
            }

            // Đổi đuôi tệp sang .webp
            const dotIdx = file.name.lastIndexOf('.');
            const baseName = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name;
            const newFileName = `${baseName}.webp`;

            const compressedFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize: compressedFile.size,
            });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Không thể giải mã hình ảnh "${file.name}" để nén.`));
    };

    img.src = objectUrl;
  });
}

/**
 * Định dạng dung lượng byte thành chuỗi dễ đọc (ví dụ: 4.2 MB, 380 KB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
}
