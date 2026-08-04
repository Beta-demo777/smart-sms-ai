package com.smartsms.common.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public final class AvatarUtil {

    private AvatarUtil() {}

    public static String defaultAvatar(String seed) {
        String safeSeed = seed == null || seed.isBlank() ? "default" : seed;
        return "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                URLEncoder.encode(safeSeed, StandardCharsets.UTF_8);
    }
}
