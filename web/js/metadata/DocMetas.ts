import {PageMeta} from './PageMeta';
import {Logger} from '../logger/Logger';
import {DocMeta} from './DocMeta';
import {PagemarkType} from './PagemarkType';
import {PageInfo} from './PageInfo';
import {DocInfos} from './DocInfos';
import {AnnotationInfos} from './AnnotationInfos';
import {Pagemarks} from './Pagemarks';
import {MetadataSerializer} from './MetadataSerializer';
import {PageMetas} from './PageMetas';
import {forDict} from '../util/Functions';
import {TextHighlights} from './TextHighlights';
import {Preconditions} from '../Preconditions';

const log = Logger.create();

export class DocMetas {

    /**
     * Create the basic DocInfo structure that we can use with required / basic
     * field structure.
     * @param fingerprint The fingerprint of the document
     * @param nrPages The number of pages in this document.
     */
    public static create(fingerprint: string, nrPages: number, filename?: string) {

        const docInfo = DocInfos.create(fingerprint, nrPages, filename);

        const pageMetas: {[id: string]: PageMeta} = {};

        for (let idx = 1; idx <= nrPages; ++idx) {
            const pageInfo = new PageInfo({num: idx});
            const pageMeta = new PageMeta({pageInfo});
            pageMetas[idx] = pageMeta;
        }

        return new DocMeta(docInfo, pageMetas);

    }

    // let result: DocInfo = Object.create(DocInfos.prototype);
    //
    // result.fingerprint = fingerprint;
    // result.nrPages = nrPages;
    // result.init(result);

    /**
     * Create a DocMeta object but place initial pagemarks on it. This is useful
     * for testing.
     * @deprecated use MockDocMetas
     */
    public static createWithinInitialPagemarks(fingerprint: string, nrPages: number) {
        return MockDocMetas.createWithinInitialPagemarks(fingerprint, nrPages);
    }

    /**
     * @deprecated use MockDocMetas
     */
    public static createMockDocMeta() {
        return MockDocMetas.createMockDocMeta();
    }

    /**
     */
    public static addPagemarks(docMeta: DocMeta, options: any) {

        if (!options) {
            options = {};
        }

        if (!options.nrPages) {
            options.nrPages = 3;
        }

        if (!options.offsetPage) {
            // the starting page
            options.offsetPage = 1;
        }

        if (!options.percentage) {
            // the percentage value from 0-100
            options.percentage = 100;
        }

        const maxPageNum = Math.min(options.offsetPage + options.nrPages - 1, docMeta.docInfo.nrPages);

        for (let pageNum = options.offsetPage; pageNum <= maxPageNum; ++pageNum ) {

            const pagemark = Pagemarks.create({
                type: PagemarkType.SINGLE_COLUMN,
                percentage: 100,
                column: 0
            });

            Pagemarks.updatePagemark(docMeta, pageNum, pagemark);

        }

    }

    public static serialize(docMeta: DocMeta, spacing: string = "  ") {
        return MetadataSerializer.serialize(docMeta, spacing);
    }

    /**
     */
    public static deserialize(data: string): DocMeta {

        Preconditions.assertPresent(data, 'data');

        if (! (typeof data === "string")) {
            throw new Error("We can only deserialize strings: " + typeof data);
        }

        let docMeta: DocMeta = Object.create(DocMeta.prototype);

        docMeta = MetadataSerializer.deserialize(docMeta, data);

        if (docMeta.docInfo && ! docMeta.docInfo.filename) {
            log.warn("DocMeta has no filename: " + docMeta.docInfo.fingerprint);
        }

        return DocMetas.upgrade(docMeta);

    }

    public static upgrade(docMeta: DocMeta) {

        // validate the JSON data and set defaults. In the future we should migrate
        // to using something like AJV to provide these defaults and also perform
        // type assertion.

        docMeta.pageMetas = PageMetas.upgrade(docMeta.pageMetas);

        // TODO: go through and upgrade the pagemarks. I should probably have
        // an upgrade function for each object type...

        if (!docMeta.annotationInfo) {
            log.debug("No annotation info.. Adding default.");
            docMeta.annotationInfo = AnnotationInfos.create();
        }

        if (!docMeta.attachments) {
            log.debug("No attachments. Adding empty map.");
            docMeta.attachments = {};
        }

        if (docMeta.docInfo) {

            if (!docMeta.docInfo.pagemarkType) {
                log.debug("DocInfo has no pagemarkType... Adding default of SINGLE_COLUMN");
                docMeta.docInfo.pagemarkType = PagemarkType.SINGLE_COLUMN;
            }

        }

        return docMeta;

    }

    /**
     * Compute the progress of a document based on the pagemarks.
     */
    public static computeProgress(docMeta: DocMeta): number {

        let total = 0;

        forDict(docMeta.pageMetas, (key, pageMeta) => {

            forDict(pageMeta.pagemarks, (column, pagemark) => {

                total += pagemark.percentage;

            });

        });

        return total / (docMeta.docInfo.nrPages * 100);

    }

    /**
     * Make changes to the document so that they write as one batched mutation
     * at the end.
     *
     * @param mutator  The function to execute which will mutation the
     * underlying DocMeta properly.
     */
    public static withBatchedMutations(docMeta: DocMeta, mutator: () => void) {

        try {

            docMeta.docInfo.mutating = true;

            mutator();

        } finally {
            // set it to undefined so that it isn't actually persisted in the
            // resulting JSON
            docMeta.docInfo.mutating = undefined;
        }

    }


}

export class MockDocMetas {


    /**
     * Create a DocMeta object but place initial pagemarks on it. This is useful
     * for testing.
     *
     */
    public static createWithinInitialPagemarks(fingerprint: string, nrPages: number) {

        const result = DocMetas.create(fingerprint, nrPages);

        const maxPages = 3;
        for (let pageNum = 1; pageNum <= Math.min(nrPages, maxPages); ++pageNum ) {

            const pagemark = Pagemarks.create({
                type: PagemarkType.SINGLE_COLUMN,
                percentage: 100,
                column: 0
            });

            Pagemarks.updatePagemark(result, pageNum, pagemark);

        }

        return result;

    }

    public static createMockDocMeta(fingerprint: string = "0x001") {

        const nrPages = 4;
        const docMeta = DocMetas.createWithinInitialPagemarks(fingerprint, nrPages);

        const textHighlight = TextHighlights.createMockTextHighlight();

        docMeta.getPageMeta(1).textHighlights[textHighlight.id] = textHighlight;

        return docMeta;

    }


}
