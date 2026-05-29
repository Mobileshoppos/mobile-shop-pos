import React, { useState } from 'react';
import { Upload, message, Spin } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient'; // Apne supabaseClient ka path check kar lein

const ProductImageUpload = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);

  // Tasveer ko chota (compress) karne ka function taake Supabase ka bill na aaye
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; // Tasveer ki chaurai (width) limit
          
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 0.7 ka matlab hai 70% quality, jo ke size ko bohat kam kar deti hai
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleUpload = async ({ file, onSuccess, onError }) => {
    try {
      setUploading(true);

      // 0. NAYA IZAFA: Agar purani tasveer mojood hai, to pehle usay Supabase se delete karein
      if (value) {
        const oldFileName = value.split('/').pop(); // URL se aakhri hissa (file ka naam) nikalna
        if (oldFileName) {
          const { error: removeError } = await supabase.storage.from('product-images').remove([oldFileName]);
          if (removeError) {
            console.error("Purani tasveer delete karne mein masla:", removeError);
          }
        }
      }
      
      // 1. Tasveer ko compress karein
      const compressedFile = await compressImage(file);
      
      // 2. Tasveer ka ek anokha (unique) naam banayein
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 3. Supabase Storage mein upload karein
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // 4. Upload hone ke baad tasveer ka public link hasil karein
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // 5. Form ko naya link bhej dein
      if (onChange) {
        onChange(imageUrl);
      }
      
      onSuccess("ok");
      message.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload Error:', error);
      message.error('Failed to upload image. Please try again.');
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  const uploadButton = (
    <div>
      {uploading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>{uploading ? 'Uploading...' : 'Upload Image'}</div>
    </div>
  );

  return (
    <Upload
      name="productImage"
      listType="picture-card"
      className="product-image-uploader"
      showUploadList={false}
      customRequest={handleUpload}
      accept="image/*"
    >
      {value ? (
        <img
          src={value}
          alt="Product"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        />
      ) : (
        uploadButton
      )}
    </Upload>
  );
};

export default ProductImageUpload;