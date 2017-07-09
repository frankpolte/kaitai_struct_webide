/// <reference path="../lib/ts-types/kaitai.d.ts" />

import KaitaiStructCompiler = require("kaitai-struct-compiler");
import KaitaiStream = require("KaitaiStream");
import { YAML } from "yamljs";
import { ObjectExporter } from "./ObjectExporter";

class KaitaiServices {
    compiler: KaitaiStructCompiler;

    ksyCode: string;
    ksy: KsySchema.IKsyFile;
    jsCode: string;

    classes: { [name: string]: any };
    mainClassName: string;

    input: ArrayBuffer;
    parsed: any;

    objectExporter: ObjectExporter;

    constructor() {
        this.compiler = new KaitaiStructCompiler();
    }

    public async compile(ksyCode: string) {
        this.ksyCode = ksyCode;
        this.ksy = YAML.parse(ksyCode);

        var releaseCode = await this.compiler.compile("javascript", this.ksy, null, false);
        var debugCode = await this.compiler.compile("javascript", this.ksy, null, true);
        var debugCodeAll = this.jsCode = Object.values(debugCode).join("\n");

        this.classes = {};

        var self = this;
        function define(name: string, deps: string[], callback: () => any) {
            self.classes[name] = callback();
            self.mainClassName = name;
        }
        define["amd"] = true;

        eval(debugCodeAll);
        console.log("compileKsy", this.mainClassName, this.classes);

        this.objectExporter = new ObjectExporter(this.ksy.types, this.classes);

        return { releaseCode, debugCode, debugCodeAll };
    }

    setInput(input: ArrayBuffer) {
        this.input = input;

        console.log("setInput", this.input);
    }

    parse() {
        var mainClass = this.classes[this.mainClassName];
        this.parsed = new mainClass(new KaitaiStream(this.input, 0));
        this.parsed._read();

        console.log("parsed", this.parsed);
    }

    export() {
        return this.objectExporter.exportValue(this.parsed, null, []);
    }

    getCompilerInfo() {
        return { version: this.compiler.version, buildDate: this.compiler.buildDate };
    }
}

declare var api: any;
try {
    var kaitaiServices = api.kaitaiServices = new KaitaiServices();
    console.log("Kaitai Worker V2!", api);
} catch(e) {
    console.log("Worker error", e);
}