import React, { useEffect, useState } from "react";
import { APPWRITE_BUCKET_GALLERY_ID as BUCKET_ID, iD as ID_GENERATE, storage } from "~/utils/appwrite";
import { Loader2 } from "lucide-react"; // Hero UI spinner

type FileData = {
  $id: string;
  name: string;
  previewUrl: string;
};

const Gallery: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({}); // 🆕

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await storage.listFiles(BUCKET_ID);
      const filesWithUrls = res.files.map((file) => ({
        $id: file.$id,
        name: file.name,
        previewUrl: storage.getFilePreview(BUCKET_ID, file.$id).toString(),
      }));
      setFiles(filesWithUrls);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!fileUpload) return;
    setLoading(true);
    try {
      await storage.createFile(BUCKET_ID, ID_GENERATE.unique(), fileUpload);
      setFileUpload(null);
      fetchImages();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    setLoading(true);
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
      fetchImages();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingFileId || !newFile) return;
    setLoading(true);
    try {
      await storage.deleteFile(BUCKET_ID, editingFileId);
      await storage.createFile(BUCKET_ID, editingFileId, newFile);
      setEditingFileId(null);
      setNewFile(null);
      fetchImages();
    } catch (err) {
      console.error("Edit error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Gallery</h1>

      <input type="file" onChange={(e) => setFileUpload(e.target.files?.[0] || null)} />
      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded ml-2"
      >
        Upload
      </button>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {files.map((file) => (
            <div key={file.$id} className="border p-2 rounded shadow relative">
              {!imageLoaded[file.$id] && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
              <img
                src={file.previewUrl}
                alt={file.name}
                loading="lazy"
                onLoad={() =>
                  setImageLoaded((prev) => ({ ...prev, [file.$id]: true }))
                }
                className={`w-full h-40 object-cover transition-opacity duration-500 ${
                  imageLoaded[file.$id] ? "opacity-100" : "opacity-0"
                }`}
              />

              <p className="mt-2 text-sm truncate">{file.name}</p>

              {editingFileId === file.$id ? (
                <>
                  <input
                    type="file"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  />
                  <button
                    onClick={handleEdit}
                    className="bg-green-500 text-white px-2 py-1 rounded mt-1"
                  >
                    Save
                  </button>
                </>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditingFileId(file.$id)}
                    className="bg-yellow-400 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(file.$id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
