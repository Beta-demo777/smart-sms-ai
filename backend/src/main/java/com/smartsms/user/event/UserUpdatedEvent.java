package com.smartsms.user.event;

import com.smartsms.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class UserUpdatedEvent extends ApplicationEvent {
    private final User user;

    public UserUpdatedEvent(Object source, User user) {
        super(source);
        this.user = user;
    }
}
