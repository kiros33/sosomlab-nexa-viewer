/** 상대 경로 이미지를 소스에서 비동기로 해석해 표시한다. */
import { useEffect, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

import type { ContentSource } from "../sources/types";
import { isExternalUrl, resolveRelative } from "../lib/paths";

type Props = ComponentPropsWithoutRef<"img"> & {
  source: ContentSource;
  docPath: string;
};

export function AsyncImage({ source, docPath, src, alt, ...rest }: Props) {
  const initial = typeof src === "string" && isExternalUrl(src) ? src : undefined;
  const [resolved, setResolved] = useState<string | undefined>(initial);

  useEffect(() => {
    let active = true;
    if (typeof src !== "string" || src === "") {
      setResolved(undefined);
      return;
    }
    if (isExternalUrl(src)) {
      setResolved(src);
      return;
    }
    source
      .resolveAsset(resolveRelative(docPath, src))
      .then((url) => {
        if (active) setResolved(url);
      })
      .catch(() => {
        if (active) setResolved(undefined);
      });
    return () => {
      active = false;
    };
  }, [src, docPath, source]);

  return <img src={resolved} alt={alt ?? ""} {...rest} />;
}
