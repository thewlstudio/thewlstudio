import ManageNav from "../ManageNav";
import SettingsReadNotice from "./SettingsReadNotice";

export default function DetailReadFailure({ title, fields }: { title: string; fields: string[] }) {
    return (
        <main id="main-content" className="max-w-2xl mx-auto px-5 py-8 md:py-12">
            <ManageNav title={title} />
            <SettingsReadNotice state={{ kind: "blocked", fields }} subject="내용" />
        </main>
    );
}
