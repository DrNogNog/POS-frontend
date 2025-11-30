"use client";

import styles from "@/styles/imagelibrary.module.css";
import Sidebar from "@/components/sidebar";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  price: number;
  images?: string[];
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<string[]>([]);
  const [popupImage, setPopupImage] = useState<string | null>(null);

  // Load images from products API
  useEffect(() => {
    async function loadProducts() {
      try {
        const data: Product[] = await api("/products");

        const allImages = data.flatMap((p) =>
          (p.images || []).map(
            (filename) => `http://localhost:4000/uploads/${encodeURIComponent(filename)}`
          )
        );

        setImages(allImages);
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popupImage && !target.closest(`.${styles.hellox}`) && !target.closest(`#${styles.PopDiv} img`)) {
        setPopupImage(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [popupImage]);

  return (
    <div className={styles.wrapper}>
      <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
        <Sidebar />

        {/* Main gallery area */}
        <main className="flex-1 flex items-center justify-center p-10">
          <div className={styles.startedx}>
            <div className={styles.containerx}>
              {Array.from({ length: Math.ceil(images.length / 3) }).map((_, rowIdx) => (
                <div className={styles.row} key={rowIdx}>
                  {images.slice(rowIdx * 3, rowIdx * 3 + 3).map((src, i) => (
                    <img
                      key={i}
                      className={styles.hellox}
                      src={src}
                      alt={`Product ${i + 1}`}
                      onClick={() => setPopupImage(src)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* POPUP */}
          {popupImage && (
            <div className={`${styles.PopDiv} ${styles.PopDivActive}`} id={styles.PopDiv}>
              <img src={popupImage} alt="Popup" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
