import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user/user.service';

interface LogEntry {
    _id: string;
    action: string;
    label: string;
    resourceName: string | null;
    timestamp: string;
}

@Component({
    selector: 'app-activity-log-widget',
    imports: [CommonModule],
    templateUrl: './activity-log-widget.component.html',
    styleUrls: ['./activity-log-widget.component.css']
})
export class ActivityLogWidgetComponent {
    logs: LogEntry[] = [];
    loading = false;
    expanded = false;

    constructor(private userService: UserService) { }

    ngOnInit() {
        this.loadLogs();
    }

    loadLogs() {
        this.loading = true;

        this.userService.getRecentLogs().subscribe({
            next: (res) => {
                this.logs = res?.logs || [];
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    getActionIcon(action: string): string {
        const icons: Record<string, string> = {
            'LOGIN': '🔑',
            'UPLOAD': '📤',
            'DOWNLOAD': '📥',
            'DELETE': '🗑️',
            'SOFT_DELETE': '🗑️',
            'SHARE': '🔗',
            'RENAME': '✏️',
            'CREATE': '📁',
            'RESTORE': '♻️',
            'REGISTER': '👤'
        };
        return icons[action] || '📝';
    }

    formatTime(timestamp: string): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}
