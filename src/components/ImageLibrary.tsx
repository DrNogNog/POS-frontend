"use client";
import styles from "@/styles/imagelibrary.module.css";
import Sidebar from "@/components/sidebar";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  description?: string;
  images?: string[];
}

interface ImageItem {
  src: string;
  name: string;
  description?: string;
  filename: string; // original filename (important!)
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [popupImage, setPopupImage] = useState<ImageItem | null>(null);
  const [updatingImage, setUpdatingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images from products
  useEffect(() => {
    async function loadProducts() {
      try {
        const data: Product[] = await api("/products");
        const allImages: ImageItem[] = data.flatMap((p) =>
          (p.images || []).map((filename) => ({
            src: `http://localhost:4000/uploads/${encodeURIComponent(filename)}`,
            name: p.name,
            description: p.description,
            filename, // keep original filename
          }))
        );
        setImages(allImages);
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  // Handle image update
const handleImageUpdate = async (oldFilename: string, newFile: File) => {
  if (!newFile.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  setUpdatingImage(oldFilename);

  const formData = new FormData();
  formData.append("newImage", newFile);
  formData.append("oldFilename", oldFilename);

  try {
    const res = await fetch("http://localhost:4000/api/products/updateImage", {
      method: "PATCH",
      body: formData,
      credentials: "include",   // This sends cookies
      mode: "cors",             // Explicitly allow CORS
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Server responded with:", res.status, text);
      throw new Error(`Server error: ${res.status} ${text.substring(0, 200)}`);
    }

    const data = await res.json();

    // Update UI
    const newFilename = data.src.split("/").pop()!;
    const newSrc = `http://localhost:4000/uploads/${encodeURIComponent(newFilename)}`;

    setImages(prev =>
      prev.map(img =>
        img.filename === oldFilename
          ? { ...img, src: newSrc, filename: newFilename }
          : img
      )
    );

    if (popupImage?.filename === oldFilename) {
      setPopupImage({ ...popupImage, src: newSrc });
    }

    alert("Image replaced successfully!");

  } catch (err: any) {
    console.error("Upload failed:", err);
    alert("Failed to update image. Are you logged in? Check console.");
  } finally {
    setUpdatingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

  // Trigger file input
  const triggerFileInput = (filename: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.target = filename;
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetFilename = e.target.dataset.target;
    if (file && targetFilename) {
      handleImageUpdate(targetFilename, file);
    }
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        popupImage &&
        !target.closest(`.${styles.hellox}`) &&
        !target.closest(`#${styles.PopDiv}`) &&
        !target.closest("button") &&
        !target.closest("input")
      ) {
        setPopupImage(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [popupImage]);

  return (
    <div className={styles.wrapper}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-target=""
      />

      <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
        <Sidebar />

        {/* Main gallery area */}
        <main className="flex-1 flex items-center justify-center p-10">
          <div className={styles.startedx}>
            <div className={styles.containerx}>
              {Array.from({ length: Math.ceil(images.length / 3) }).map((_, rowIdx) => (
                <div className={styles.row} key={rowIdx}>
                  {images.slice(rowIdx * 3, rowIdx * 3 + 3).map((item, i) => (
                    <div key={i} className="relative flex flex-col items-center gap-3 group">
                      {/* Image with hover overlay */}
                      <div className="relative">
                        <img
                          className={`${styles.hellox} cursor-pointer transition-all group-hover:brightness-75`}
                          src={item.src}
                          alt={item.name}
                          onClick={() => setPopupImage(item)}
                        />

                        {/* Replace Button on Hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerFileInput(item.filename);
                          }}
                          disabled={updatingImage === item.filename}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 text-white font-medium text-sm px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-black/70 disabled:opacity-70"
                        >
                          {updatingImage === item.filename ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              Updating...
                            </span>
                          ) : (
                            "Replace Image"
                          )}
                        </button>
                      </div>

                      <div className="text-center text-white dark:text-white max-w-xs">
                        <div className="font-semibold truncate block">{item.name}</div>
                        {item.description && <div className="text-sm opacity-80">{item.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* POPUP */}
          {popupImage && (
            <div
              className={`${styles.PopDiv} ${styles.PopDivActive} flex flex-col items-center justify-center`}
              id={styles.PopDiv}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={popupImage.src}
                  alt={popupImage.name}
                  className="max-w-full max-h-96 object-contain rounded-lg shadow-2xl"
                />

                {/* Replace button in popup */}
                <button
                  onClick={() => triggerFileInput(popupImage.filename)}
                  disabled={updatingImage === popupImage.filename}
                  className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingImage === popupImage.filename ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Replace Image
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 text-center text-white bg-black/50 backdrop-blur px-8 py-4 rounded-lg">
                <div className="text-2xl font-bold">{popupImage.name}</div>
                {popupImage.description && <div className="mt-2 text-lg opacity-90">{popupImage.description}</div>}
              </div>

              <button
                onClick={() => setPopupImage(null)}
                className="absolute top-6 right-6 text-white text-4xl font-light hover:scale-125 transition-transform"
              >
                ×
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}