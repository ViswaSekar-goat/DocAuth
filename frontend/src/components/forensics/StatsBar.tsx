import { FileCheck, FileX, Clock, Zap } from "lucide-react";

interface StatsBarProps {
    totalScans: number;
    realCount: number;
    fakeCount: number;
    avgProcessingTime: string;
}

export function StatsBar({ totalScans, realCount, fakeCount, avgProcessingTime }: StatsBarProps) {
    return (
        <div className="glass-panel px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold font-mono">{totalScans}</p>
                            <p className="text-xs text-muted-foreground">Total Scans</p>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-border" />

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                            <FileCheck className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold font-mono text-success">{realCount}</p>
                            <p className="text-xs text-muted-foreground">Verified Real</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <FileX className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold font-mono text-destructive">{fakeCount}</p>
                            <p className="text-xs text-muted-foreground">Detected Fake</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div className="text-right">
                        <p className="text-lg font-bold font-mono">{avgProcessingTime}</p>
                        <p className="text-xs text-muted-foreground">Avg. Processing</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
