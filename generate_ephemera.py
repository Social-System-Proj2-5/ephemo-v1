import os
import sys
import requests
from openai import OpenAI

def generate_ephemera():
    # 1. APIクライアントの初期化（GitHub Secretsから自動読み込み）
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("エラー: OPENAI_API_KEY が設定されていません。")
        sys.exit(1)
        
    client = OpenAI(api_key=api_key)

    # 2. プロンプトの読み込み
    prompt_file = "prompt.txt"
    if not os.path.exists(prompt_file):
        with open(prompt_file, "w", encoding="utf-8") as f:
            f.write("A vintage botanical ticket, 19th century style")
    
    with open(prompt_file, "r", encoding="utf-8") as f:
        user_prompt = f.read().strip()

    full_prompt = f"Beautiful vintage ephemera, junk journal style, old paper texture, highly detailed, {user_prompt}"
    print(f"生成を開始します。プロンプト: {full_prompt}")

    # 3. OpenAI APIを叩いて画像生成
    try:
        # モデル名は標準的な "dall-e-3" を指定しています。
        # 利用したい特定のモデル名（gpt-image-2等）が提供されている場合は、以下を書き換えてください。
        response = client.images.generate(
            model="dall-e-3", 
            prompt=full_prompt,
            n=1,
            size="1024x1792",  # エフェメラ（チケットやしおり）に適した縦長サイズ
            quality="standard",
        )
        
        # 4. 生成された画像のURLを取得してダウンロード
        image_url = response.data[0].url
        output_path = "output_ephemera_1.png"
        
        print("画像をダウンロード中...")
        img_data = requests.get(image_url).content
        with open(output_path, "wb") as f:
            f.write(img_data)
            
        print(f"成功: {output_path} を保存しました。")
            
    except Exception as e:
        print(f"APIエラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    generate_ephemera()