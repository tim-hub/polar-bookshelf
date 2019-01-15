import {WriteStream} from "fs";
import {Files} from '../../util/Files';
import {Preconditions} from '../../Preconditions';
import {ExportWriter} from './Exporter';

export class FileExportWriter implements ExportWriter {

    private readonly path: string;

    private stream?: WriteStream;

    constructor(path: string) {
        this.path = path;
    }

    public async init(): Promise<void> {
        this.stream = await Files.createWriteStream(this.path);
    }

    public async write(data: string): Promise<void> {

        Preconditions.assertPresent(this.stream, "no stream");
        this.stream!.write(data);

    }

    public async close(err?: Error): Promise<void> {

        if (this.stream) {
            this.stream.close();
        }

    }

}
