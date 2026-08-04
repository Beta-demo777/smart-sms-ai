package com.smartsms.ai.provider;

import java.util.List;

public interface AiProvider {
    String name();

    String chat(List<AiProviderMessage> history, String message, String context);

    String complete(String prompt);
}
