#!/usr/bin/env python3
"""Mejora el logo de la portada con la API de OpenAI (gpt-image) y arma una nueva versión del PDF.

Uso:
  python3 mejorar_logo.py LUJIS_Presentacion_Marca_v3.pdf LUJIS_Presentacion_Marca_v4.pdf [--logo logo.png]

- Sin --logo: saca el logo de la portada del PDF (imagen + máscara de transparencia), lo manda a
  /v1/images/edits y guarda las variantes en img/logo-portada-ia-N.png para elegir.
- Con --logo: no llama a OpenAI; reemplaza el logo de la portada del PDF por ese PNG (RGBA).
La clave la inyecta el proxy del entorno; OPENAI_API_KEY puede ser un placeholder.
"""
import argparse, base64, io, json, os, subprocess, sys, tempfile, urllib.request, uuid
from PIL import Image
from pypdf import PdfReader, PdfWriter

PROMPT = (
    "Redraw this exact logo as a clean, crisp, professional vector-style mark, white on a transparent "
    "background. Keep the identical layout, proportions and wording: three five-pointed stars in an arc "
    "on top, the word \"LUJI'S\" in tall condensed bold capitals, and \"SABOR ARGENTINO\" below in "
    "condensed stencil-like capitals. Same letterforms and spacing, but with smooth sharp edges, no blur, "
    "no jagged pixels, no halo. Keep a subtle, even worn/distressed texture inside the letters only. "
    "Do not add, remove or change any letter, star, color or element."
)


def extraer_logo(pdf):
    img = PdfReader(pdf).pages[0].images[0]
    return img.image.convert("RGBA")


def pedir_a_openai(logo, n, modelo):
    tile = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    l = logo.copy(); l.thumbnail((1400, 940), Image.LANCZOS)
    tile.alpha_composite(l, ((1536 - l.width) // 2, (1024 - l.height) // 2))
    buf = io.BytesIO(); tile.save(buf, "PNG")
    campos = {"model": modelo, "prompt": PROMPT, "n": str(n), "size": "1536x1024",
              "background": "transparent", "quality": "high", "input_fidelity": "high"}
    b = uuid.uuid4().hex; cuerpo = b""
    for k, v in campos.items():
        cuerpo += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    cuerpo += (f"--{b}\r\nContent-Disposition: form-data; name=\"image[]\"; filename=\"logo.png\"\r\n"
               f"Content-Type: image/png\r\n\r\n").encode() + buf.getvalue() + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=cuerpo, headers={
        "Content-Type": f"multipart/form-data; boundary={b}",
        "Authorization": "Bearer " + os.environ.get("OPENAI_API_KEY", "proxy-injected")})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAI {e.code}: {e.read().decode()[:500]}")
    return [Image.open(io.BytesIO(base64.b64decode(d["b64_json"]))).convert("RGBA") for d in r["data"]]


def ajustar(logo, ref):
    """Recorta al contenido y centra en un lienzo con la misma proporción que el logo original."""
    logo = logo.crop(logo.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
    W = 2400; H = round(W * ref.height / ref.width)
    rb = ref.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    escala = min(W * (rb[2] - rb[0]) / ref.width / logo.width, H * (rb[3] - rb[1]) / ref.height / logo.height)
    logo = logo.resize((round(logo.width * escala), round(logo.height * escala)), Image.LANCZOS)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(logo, ((W - logo.width) // 2, (H - logo.height) // 2))
    return out


def reemplazar_en_pdf(pdf_in, pdf_out, logo):
    """Cambia el XObject del logo (imagen + SMask) por uno nuevo, sin tocar el resto de la página."""
    import zlib
    from pypdf.generic import NameObject, NumberObject, StreamObject
    def flujo(datos, cs, w, h):
        st = StreamObject(); st.set_data(zlib.compress(datos, 9))
        st.update({NameObject("/Type"): NameObject("/XObject"), NameObject("/Subtype"): NameObject("/Image"),
                   NameObject("/Width"): NumberObject(w), NameObject("/Height"): NumberObject(h),
                   NameObject("/ColorSpace"): NameObject(cs), NameObject("/BitsPerComponent"): NumberObject(8),
                   NameObject("/Filter"): NameObject("/FlateDecode")})
        return st
    w = PdfWriter(clone_from=pdf_in)
    xo = w.pages[0]["/Resources"]["/XObject"]
    nombre = "/" + w.pages[0].images[0].name.split(".")[0].lstrip("/")
    rgb = logo.convert("RGB").tobytes(); a = logo.getchannel("A").tobytes()
    img = flujo(rgb, "/DeviceRGB", *logo.size)
    img[NameObject("/SMask")] = w._add_object(flujo(a, "/DeviceGray", *logo.size))
    xo[NameObject(nombre)] = w._add_object(img)
    w.write(pdf_out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf_in"); ap.add_argument("pdf_out")
    ap.add_argument("--logo"); ap.add_argument("-n", type=int, default=3)
    ap.add_argument("--modelo", default="gpt-image-1")
    a = ap.parse_args()
    aqui = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(aqui, "img"), exist_ok=True)
    original = extraer_logo(a.pdf_in)
    if a.logo:
        nuevo = ajustar(Image.open(a.logo).convert("RGBA"), original)
        nuevo.save(os.path.join(aqui, "img", "logo-portada-v4.png"))
        reemplazar_en_pdf(a.pdf_in, a.pdf_out, nuevo)
        print("PDF:", a.pdf_out)
    else:
        for i, v in enumerate(pedir_a_openai(original, a.n, a.modelo), 1):
            p = os.path.join(aqui, "img", f"logo-portada-ia-{i}.png"); v.save(p); print(p)
        print("Elegí una variante y corré de nuevo con --logo img/logo-portada-ia-N.png")
